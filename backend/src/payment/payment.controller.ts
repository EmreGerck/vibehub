import {
  Controller, Post, Body, Param, Req, Get,
  HttpCode, HttpStatus, Logger, BadRequestException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Request } from 'express';
import * as crypto from 'crypto';
import { IyzicoService } from './iyzico.service';
import { EInvoiceService } from '../einvoice/einvoice.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { ApiResponse } from '../common/response.dto';
import { OrderStatus, UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

class MockPayDto {
  @IsString() orderId: string;
}

class RefundPaymentDto {
  @IsOptional() @IsNumber() amount?: number;
}


@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly iyzico: IyzicoService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly einvoice: EInvoiceService,
    private readonly mail: MailService,
  ) {}

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('iyzico/initiate/:orderId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate İyzico checkout session for an order' })
  async initiate(@Param('orderId') orderId: string, @CurrentUser() user: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');
    if (order.customerId !== user.id) throw new ForbiddenException('Not your order');

    const result = await this.iyzico.initiatePayment(
      orderId,
      Number(order.totalAmount),
      order.currency,
      { id: user.id, name: user.email, email: user.email },
    );
    return ApiResponse.ok(result, 'Payment session created');
  }

  @Public()
  @Post('iyzico/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'İyzico payment callback webhook (public — called by İyzico)' })
  async callback(@Req() req: Request) {
    // Verify webhook signature to ensure request originates from İyzico
    const secretKey = this.config.get<string>('IYZICO_SECRET_KEY', '');
    const receivedSignature = req.headers['x-iyzico-signature'] as string | undefined;

    if (secretKey && receivedSignature) {
      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(payload)
        .digest('base64');
      if (receivedSignature !== expectedSignature) {
        this.logger.warn('[PAYMENT] Callback rejected — invalid İyzico signature');
        throw new ForbiddenException('Invalid webhook signature');
      }
    } else if (secretKey && !receivedSignature) {
      // In production with real credentials, always require signature
      if (this.config.get('NODE_ENV') === 'production') {
        throw new ForbiddenException('Missing webhook signature');
      }
    }

    const token = req.body?.token;
    if (!token) throw new BadRequestException('Missing token in callback');

    const result = await this.iyzico.verifyPayment(token);

    if (result.success && result.conversationId) {
      // conversationId is stored as "conv-<orderId>" during initiation
      const orderId = result.conversationId.replace(/^conv-/, '');
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (order && order.status === OrderStatus.PLACED) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.CONFIRMED,
            paymentRef: result.paymentId,
          },
        });
        this.logger.log(`[PAYMENT] Order ${orderId} confirmed via İyzico callback`);

        // ── Auto-issue e-Arşiv invoice (Turkish legal requirement) ──────────
        // Fire-and-forget — invoice failure must NOT block payment confirmation
        this._autoIssueInvoice(orderId, order).catch(err =>
          this.logger.error(`[EINVOICE] Auto-issue failed for order ${orderId}: ${err.message}`),
        );
      }
    }

    return ApiResponse.ok({ received: true }, 'Callback processed');
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('iyzico/verify/:token')
  @ApiBearerAuth()
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Manually verify a payment by token (admin only)' })
  async verify(@Param('token') token: string) {
    const result = await this.iyzico.verifyPayment(token);
    return ApiResponse.ok(result, 'Payment verified');
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('iyzico/refund/:paymentId')
  @ApiBearerAuth()
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Refund a payment (admin only)' })
  async refund(@Param('paymentId') paymentId: string, @Body() dto: RefundPaymentDto) {
    const result = await this.iyzico.refundPayment(paymentId, dto.amount);
    return ApiResponse.ok(result, 'Refund processed');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Mock payment (dev/demo — simulates the full iyzico → callback → confirm flow)
  // ─────────────────────────────────────────────────────────────────────────────

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('mock/pay')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate payment confirmation (demo mode — non-production only)' })
  // NOTE: `user` is intentionally `any` here. The mock-pay handler pulls
  // Prisma-typed fields (order with deep-includes) and threads them through
  // helpers without strict typing. Casting on each access would be noisier
  // than the alternative. Real-prod cleanup is in Sprint 12 G2.
  async mockPay(@Body() dto: MockPayDto, @CurrentUser() user: any) {
    // Hard production guard — never allow free order confirmation in real env
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
    // Use 'any' cast — Prisma types update after `prisma generate` on deploy
    const order: any = await (this.prisma.order.findUnique as any)({
      where: { id: dto.orderId },
      include: {
        customer: { select: { email: true, name: true } },
        items: {
          include: {
            variant: { include: { product: { include: { category: { select: { vatRate: true } } } } } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== user.id) throw new ForbiddenException('Not your order');
    if (order.status !== OrderStatus.PLACED) {
      throw new BadRequestException(`Order is already ${order.status} — cannot pay again`);
    }

    // Generate mock payment reference
    const paymentRef = `pay-mock-${crypto.randomBytes(8).toString('hex')}`;

    // ── Issue e-Arşiv invoice (mock — auto) ─────────────────────────────────
    const shippingAddr = (order.shippingAddress ?? {}) as any;
    const invoiceResult = await this.einvoice.issueEArchive({
      orderId: order.id,
      buyer: {
        identityNumber: '11111111111',   // placeholder TC — collect at checkout in production
        name:  order.customer?.name ?? order.customer?.email ?? 'Müşteri',
        email: order.customer?.email ?? '',
        address: [shippingAddr.line1, shippingAddr.line2].filter(Boolean).join(' ') || 'Turkey',
        city:    shippingAddr.city    || 'Istanbul',
        country: shippingAddr.country || 'Turkey',
      },
      lines: order.items.map((item: any) => ({
        description: item.variant?.product?.title ?? `Ürün ${item.variantId.slice(0, 8)}`,
        quantity:    item.qty,
        unitPrice:   Number(item.unitPriceSnapshot),
        // Pull VAT from the product's category (Turkish KDV varies %1/%8/%18/%20).
        // Fallback to 0.20 if no category set (merch default).
        vatRate:     Number(item.variant?.product?.category?.vatRate ?? 0.20),
        unit:        'ADET',
      })),
      currency:    order.currency,
      invoiceDate: new Date(),
      type:        'EARCHIVE',
    });

    const invoiceNumber = invoiceResult.invoiceNumber ?? null;

    // ── Confirm order in DB ──────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma.order.update as any)({
      where: { id: order.id },
      data: {
        status:        OrderStatus.CONFIRMED,
        paymentRef,
        invoiceNumber,          // available after `prisma generate` post-migration
      },
    });

    this.logger.log(`[MOCK-PAY] Order ${order.id} confirmed | paymentRef=${paymentRef} invoice=${invoiceNumber}`);

    // ── Send confirmation email (fire-and-forget) ────────────────────────────
    if (order.customer?.email) {
      this.mail.sendOrderConfirmed(order.customer.email, order.id).catch(err =>
        this.logger.error(`[MOCK-PAY] Email failed for order ${order.id}: ${err.message}`),
      );
    }

    return ApiResponse.ok({
      orderId:       order.id,
      paymentRef,
      invoiceNumber,
      invoiceId:     invoiceResult.invoiceId,
      mockInvoice:   invoiceResult.mock ?? true,
    }, 'Ödeme alındı — sipariş onaylandı');
  }

  // ── Invoice data for frontend rendering ─────────────────────────────────────

  @Get('invoice/:orderId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice data for an order (customer-facing)' })
  async getInvoiceData(@Param('orderId') orderId: string, @CurrentUser() user: AuthenticatedUser) {
    // Use 'any' cast — Prisma types update after `prisma generate` on deploy
    const order: any = await (this.prisma.order.findUnique as any)({
      where: { id: orderId },
      include: {
        customer: { select: { email: true, name: true } },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    tenant: { select: { displayName: true } },
                    category: { select: { vatRate: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== user.id) throw new ForbiddenException('Not your order');

    const shippingAddr = (order.shippingAddress ?? {}) as any;
    const lines = order.items.map((item: any) => {
      const unitPrice = Number(item.unitPriceSnapshot);
      const qty       = item.qty;
      const vatRate   = Number(item.variant?.product?.category?.vatRate ?? 0.20);
      const lineTotal = unitPrice * qty;
      const vatAmount = lineTotal * vatRate;
      return {
        description: item.variant?.product?.title ?? 'Ürün',
        vendorName:  item.variant?.product?.tenant?.displayName ?? 'VibeHub',
        quantity:    qty,
        unitPrice,
        vatRate,
        lineTotal,
        vatAmount,
      };
    });

    const subtotal   = lines.reduce((s: number, l: any) => s + l.lineTotal, 0);
    const totalVat   = lines.reduce((s: number, l: any) => s + l.vatAmount, 0);
    const grandTotal = subtotal + totalVat;

    return ApiResponse.ok({
      invoiceNumber:  order.invoiceNumber ?? null,
      invoiceDate:    order.updatedAt,
      orderId:        order.id,
      currency:       order.currency,
      buyer: {
        name:    order.customer?.name ?? 'Müşteri',
        email:   order.customer?.email ?? '',
        address: [shippingAddr.line1, shippingAddr.line2].filter(Boolean).join(', '),
        city:    shippingAddr.city    ?? '',
        country: shippingAddr.country ?? 'TR',
      },
      seller: {
        name:    'VibeHub Teknoloji A.Ş.',
        address: 'Levent Mah. Büyükdere Cad. No:185/A, 34394 Şişli/İstanbul',
        taxId:   '1234567890',
        taxOffice: 'Şişli',
        email:   'fatura@vibehub.com.tr',
      },
      lines,
      subtotal,
      totalVat,
      grandTotal,
    }, 'Invoice data');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private async _autoIssueInvoice(orderId: string, order: any): Promise<void> {
    // Load the order with customer and items
    // Cast prisma + result as any — Category.vatRate column added in 20260528010000
    // migration; types regenerate at deploy on prisma generate
    const fullOrder: any = await (this.prisma.order.findUnique as any)({
      where: { id: orderId },
      include: {
        customer: { select: { email: true, name: true } },
        items: {
          include: {
            variant: { include: { product: { include: { category: { select: { vatRate: true } } } } } },
          },
        },
      },
    });

    if (!fullOrder) return;

    const shippingAddr = (fullOrder.shippingAddress ?? {}) as any;

    const result = await this.einvoice.issueEArchive({
      orderId,
      buyer: {
        // Use a generic TC placeholder — in production, collect TC/VKN at checkout
        identityNumber: '11111111111',
        name:           fullOrder.customer?.name ?? fullOrder.customer?.email ?? 'Customer',
        email:          fullOrder.customer?.email ?? '',
        address:        [shippingAddr.line1, shippingAddr.line2].filter(Boolean).join(' ') || 'Turkey',
        city:           shippingAddr.city    || 'Istanbul',
        country:        shippingAddr.country || 'Turkey',
      },
      lines: fullOrder.items.map(item => ({
        description: item.variant?.product?.title ?? `Item ${item.variantId.slice(0, 8)}`,
        quantity:    item.qty,
        unitPrice:   Number(item.unitPriceSnapshot),
        // Per-category KDV — fallback to %20 if no category set
        vatRate:     Number((item.variant?.product as any)?.category?.vatRate ?? 0.20),
        unit:        'ADET',
      })),
      currency:    fullOrder.currency,
      invoiceDate: new Date(),
      type:        'EARCHIVE',
    });

    if (result.success) {
      this.logger.log(
        `[EINVOICE] Auto-issued for order ${orderId} | number=${result.invoiceNumber} mock=${result.mock}`,
      );
    } else {
      this.logger.error(
        `[EINVOICE] Auto-issue failed for order ${orderId} | error=${result.errorMessage}`,
      );
    }
  }
}
