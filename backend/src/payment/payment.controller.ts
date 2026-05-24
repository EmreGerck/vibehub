import {
  Controller, Post, Body, Param, Req,
  HttpCode, HttpStatus, Logger, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import * as crypto from 'crypto';
import { IyzicoService } from './iyzico.service';
import { EInvoiceService } from '../einvoice/einvoice.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { ApiResponse } from '../common/response.dto';
import { OrderStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly iyzico: IyzicoService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly einvoice: EInvoiceService,
  ) {}

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('iyzico/initiate/:orderId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate İyzico checkout session for an order' })
  async initiate(@Param('orderId') orderId: string, @CurrentUser() user: any) {
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
  @ApiOperation({ summary: 'Manually verify a payment by token' })
  async verify(@Param('token') token: string) {
    const result = await this.iyzico.verifyPayment(token);
    return ApiResponse.ok(result, 'Payment verified');
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('iyzico/refund/:paymentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a payment' })
  async refund(@Param('paymentId') paymentId: string, @Body('amount') amount: number) {
    const result = await this.iyzico.refundPayment(paymentId, amount);
    return ApiResponse.ok(result, 'Refund processed');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private async _autoIssueInvoice(orderId: string, order: any): Promise<void> {
    // Load the order with customer and items
    const fullOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { email: true, name: true } },
        items: {
          include: { variant: { include: { product: true } } },
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
        vatRate:     0.20,
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
