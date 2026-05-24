/**
 * EInvoiceController
 * ──────────────────
 * Admin-only endpoints to:
 *   - Manually trigger invoice issuance for a specific order
 *   - Query invoice status
 *   - List invoices for an order
 *
 * In normal flow, invoices are issued automatically via the order service
 * after payment confirmation. These endpoints exist for manual re-issue
 * and debugging.
 */

import {
  Controller, Post, Get, Param, Body,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiResponse } from '../common/response.dto';
import { EInvoiceService, IssueInvoiceInput } from './einvoice.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IsEmail, IsOptional, IsString } from 'class-validator';

class ManualInvoiceDto {
  @IsString() identityNumber: string;
  @IsString() buyerName: string;
  @IsEmail()  buyerEmail: string;
  @IsString() address: string;
  @IsString() city: string;
  @IsString() country: string;
  @IsOptional() @IsString() taxOffice?: string;
  @IsOptional() @IsString() type?: 'EARCHIVE' | 'EINVOICE';
}

@ApiTags('E-Invoice')
@Controller('einvoice')
@ApiBearerAuth()
@Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
export class EInvoiceController {
  constructor(
    private readonly einvoice: EInvoiceService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Issue (or re-issue) an e-Arşiv invoice for a confirmed order.
   * Called by admin when automatic issuance fails, or for manual correction.
   */
  @Post('issue/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually issue e-Arşiv/e-Fatura for an order' })
  async issueForOrder(
    @Param('orderId') orderId: string,
    @Body() dto: ManualInvoiceDto,
    @CurrentUser('id') actorId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { variant: { include: { product: true } } },
        },
      },
    });

    if (!order) {
      return ApiResponse.fail('Order not found');
    }

    const lines = order.items.map(item => ({
      description: item.variant?.product?.title ?? `Item ${item.variantId.slice(0, 8)}`,
      quantity:    item.qty,
      unitPrice:   Number(item.unitPriceSnapshot),
      vatRate:     0.20,   // %20 KDV — adjustable per product category in future
      unit:        'ADET',
    }));

    const input: IssueInvoiceInput = {
      orderId,
      buyer: {
        identityNumber: dto.identityNumber,
        name:           dto.buyerName,
        email:          dto.buyerEmail,
        address:        dto.address,
        city:           dto.city,
        country:        dto.country,
        taxOffice:      dto.taxOffice,
      },
      lines,
      currency:  order.currency,
      invoiceDate: new Date(),
      type:      dto.type ?? 'EARCHIVE',
    };

    const result = dto.type === 'EINVOICE'
      ? await this.einvoice.issueEInvoice(input)
      : await this.einvoice.issueEArchive(input);

    if (result.success) {
      // Store invoice reference on the order for traceability
      await this.prisma.order.update({
        where: { id: orderId },
        data:  { paymentRef: order.paymentRef ?? result.invoiceNumber },
      });

      await this.audit.log({
        actorId,
        action:     'EINVOICE_ISSUED',
        targetType: 'Order',
        targetId:   orderId,
        metadata:   {
          invoiceNumber: result.invoiceNumber,
          invoiceId:     result.invoiceId,
          type:          dto.type ?? 'EARCHIVE',
          mock:          result.mock,
        },
      });
    }

    return ApiResponse.ok(result, result.success ? 'Invoice issued' : 'Invoice issue failed');
  }

  /**
   * Query the GİB status of an invoice.
   */
  @Get('status/:invoiceId')
  @ApiOperation({ summary: 'Query e-Arşiv/e-Fatura status from Foriba' })
  async getStatus(@Param('invoiceId') invoiceId: string) {
    const status = await this.einvoice.getInvoiceStatus(invoiceId);
    return ApiResponse.ok(status, 'Invoice status');
  }
}
