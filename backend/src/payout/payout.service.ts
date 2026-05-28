import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreatePayoutDto,
  UpdatePayoutStatusDto,
  QueryPayoutsDto,
} from './dto/payout.dto';
import { PayoutStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: QueryPayoutsDto) {
    const where: any = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.status) where.status = query.status;

    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        skip: query.skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { id: true, slug: true, displayName: true } } },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async listForTenant(tenantId: string, query: QueryPayoutsDto) {
    return this.list({ ...query, tenantId, skip: query.skip } as QueryPayoutsDto);
  }

  /**
   * Create a payout for a vendor. If amounts are omitted, they're computed from
   * settled (non-cancelled / non-refunded) order items in the given period whose
   * order has been DELIVERED.
   */
  async create(dto: CreatePayoutDto, actorId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Vendor not found');

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (periodEnd <= periodStart) {
      throw new BadRequestException('periodEnd must be after periodStart');
    }

    // Overlap detection: refuse if any existing non-FAILED payout for this
    // tenant covers any part of the requested period. Prevents double-paying
    // the vendor for the same DELIVERED orders.
    // Two periods overlap iff: a.start < b.end AND a.end > b.start
    const overlap = await this.prisma.payout.findFirst({
      where: {
        tenantId: dto.tenantId,
        status: { not: PayoutStatus.FAILED },
        AND: [
          { periodStart: { lt: periodEnd } },
          { periodEnd:   { gt: periodStart } },
        ],
      },
      select: { id: true, periodStart: true, periodEnd: true, status: true },
    });
    if (overlap) {
      throw new BadRequestException(
        `Bu satıcı için ${overlap.periodStart.toISOString().slice(0,10)} — ${overlap.periodEnd.toISOString().slice(0,10)} dönemini kapsayan bir payout zaten var (${overlap.status}). Çift ödeme yapılamaz.`,
      );
    }

    let gross = dto.grossAmount !== undefined ? new Decimal(dto.grossAmount) : null;
    let net = dto.netAmount !== undefined ? new Decimal(dto.netAmount) : null;
    let fee = dto.platformFee !== undefined ? new Decimal(dto.platformFee) : null;

    if (gross === null || net === null || fee === null) {
      const items = await this.prisma.orderItem.findMany({
        where: {
          tenantId: dto.tenantId,
          order: {
            status: 'DELIVERED',
            createdAt: { gte: periodStart, lte: periodEnd },
          },
        },
        select: { qty: true, unitPriceSnapshot: true, vendorPayoutAmount: true },
      });

      const grossSum = items.reduce(
        (s, i) => s.add(new Decimal(i.unitPriceSnapshot).mul(i.qty)),
        new Decimal(0),
      );
      const netSum = items.reduce(
        (s, i) => s.add(new Decimal(i.vendorPayoutAmount)),
        new Decimal(0),
      );
      const feeSum = grossSum.sub(netSum);

      gross = gross ?? grossSum;
      net = net ?? netSum;
      fee = fee ?? feeSum;
    }

    const payout = await this.prisma.payout.create({
      data: {
        tenantId: dto.tenantId,
        periodStart,
        periodEnd,
        grossAmount: gross,
        platformFee: fee,
        netAmount: net,
        status: PayoutStatus.PENDING,
      },
      include: { tenant: { select: { id: true, slug: true, displayName: true } } },
    });

    await this.audit.log({
      actorId,
      action: 'PAYOUT_CREATED',
      targetType: 'Payout',
      targetId: payout.id,
      metadata: { tenantId: dto.tenantId, gross: Number(gross), net: Number(net) },
    });

    return payout;
  }

  async updateStatus(id: string, dto: UpdatePayoutStatusDto, actorId: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');

    if (payout.status === PayoutStatus.PAID && dto.status !== PayoutStatus.PAID) {
      throw new BadRequestException('Cannot move a PAID payout back to another state');
    }

    const updated = await this.prisma.payout.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.audit.log({
      actorId,
      action: `PAYOUT_${dto.status}`,
      targetType: 'Payout',
      targetId: id,
      metadata: { from: payout.status, to: dto.status, reason: dto.reason },
    });

    return updated;
  }

  async delete(id: string, actorId: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status === PayoutStatus.PAID) {
      throw new BadRequestException('Cannot delete a PAID payout');
    }

    await this.prisma.payout.delete({ where: { id } });

    await this.audit.log({
      actorId,
      action: 'PAYOUT_DELETED',
      targetType: 'Payout',
      targetId: id,
      metadata: { tenantId: payout.tenantId, status: payout.status },
    });

    return { deleted: true };
  }
}
