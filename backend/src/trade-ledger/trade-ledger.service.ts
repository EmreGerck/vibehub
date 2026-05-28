import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TradeLedgerQueryDto } from './dto/trade-ledger.dto';
import { Prisma } from '@prisma/client';

/**
 * Admin sales history with rich filters + per-order money breakdown.
 *
 * The Order model has no `tenantId` or `fulfilment` of its own — those live
 * on OrderItem because an order can mix multiple vendors and even mix lanes
 * (some items VENDOR_MANAGED, some VIBEHUB_MANAGED). So the listing joins on
 * items.some(...) and the response surfaces:
 *
 *   vendors       — distinct tenant displayNames in the order
 *   fulfilmentMix — 'VIBEHUB' | 'VENDOR' | 'BOTH' (KARMA)
 *   moneyBreakdown — gross, vatExtracted (lane-1 only), mfgCost (lane-1 only),
 *                    vendorTotal, platformTotal
 */
@Injectable()
export class TradeLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── List ────────────────────────────────────────────────────────────────────

  async list(query: TradeLedgerQueryDto) {
    const where = this.buildWhere(query);
    const limit = query.limit ?? 20;
    const page  = query.page  ?? 1;
    const skip  = query.skip  ?? (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer:  { select: { id: true, email: true } },
          items: {
            include: {
              tenant:  { select: { id: true, displayName: true, slug: true } },
              variant: { include: { product: { select: { id: true, title: true } } } },
            },
          },
          shipments:      { select: { carrier: true, trackingNumber: true, status: true } },
          returnShipment: { select: { status: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // Decorate each order with vendor list, fulfilment mix, and money totals
    // computed from the snapshotted OrderItem fields (no live recompute — the
    // ledger reflects what was committed at order time).
    const items = await Promise.all(orders.map(async (o) => this.decorate(o)));

    return { items, total, page, limit };
  }

  // ── Detail ──────────────────────────────────────────────────────────────────

  async findOne(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer:  { select: { id: true, email: true } },
        items: {
          include: {
            tenant:            { select: { id: true, displayName: true, slug: true } },
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    images: true,
                    manufacturingUnit: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        shipments:      true,
        returnShipment: true,
      },
    });
    if (!order) throw new NotFoundException('Sipariş bulunamadı');

    // Reviews left by this customer on the products they bought in this order.
    const productIds = order.items.map((i) => i.variant?.product?.id).filter(Boolean) as string[];
    const reviews = productIds.length > 0
      ? await this.prisma.review.findMany({
          where: { customerId: order.customerId, productId: { in: productIds } },
          select: { id: true, productId: true, rating: true, comment: true, createdAt: true },
        })
      : [];

    // Audit timeline scoped to this order — gives a story of who did what when.
    const auditEntries = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { targetType: 'Order',          targetId: orderId },
          { targetType: 'ReturnShipment', targetId: order.returnShipment?.id ?? '__none__' },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, action: true, actorId: true, createdAt: true, metadata: true },
    });

    return {
      ...(await this.decorate(order)),
      // Full lane-1/2 breakdown per line for the drill-down panel.
      itemsDetailed: order.items.map((it) => ({
        id:                    it.id,
        productId:             it.variant?.product?.id,
        productTitle:          it.variant?.product?.title ?? `Variant ${it.variantId}`,
        productImage:          (it.variant?.product?.images ?? [])[0] ?? null,
        manufacturingUnitName: (it.variant?.product as any)?.manufacturingUnit?.name ?? null,
        tenant:                it.tenant,
        qty:                   it.qty,
        unitPrice:             Number(it.unitPriceSnapshot),
        lineTotal:             Number(it.unitPriceSnapshot) * it.qty,
        fulfilment:            it.fulfilment,
        vendorPayout:          Number(it.vendorPayoutAmount),
        // Lane-1 only fields — null when VENDOR_MANAGED.
        manufacturingCost:     it.manufacturingCostSnapshot != null
          ? Number(it.manufacturingCostSnapshot) : null,
        profitSharePct:        it.profitSharePctSnapshot != null
          ? Number(it.profitSharePctSnapshot) : null,
        platformShare:         it.platformShareAmount != null
          ? Number(it.platformShareAmount) : null,
        commissionRate:        Number(it.commissionRateSnapshot),
      })),
      shipments: order.shipments,
      returnShipment: order.returnShipment,
      reviews,
      auditEntries,
    };
  }

  // ── CSV export ─────────────────────────────────────────────────────────────

  async exportCsv(query: TradeLedgerQueryDto, actorId: string): Promise<string> {
    // Audit-log every export — CSV contains customer PII (email) and money breakdowns.
    await this.audit.log({
      actorId,
      action: 'TRADE_LEDGER_EXPORTED',
      targetType: 'Order',
      targetId: null,
      metadata: { filters: query as any },
    });

    // Big result set — cap at 10k rows per export to keep memory bounded.
    const MAX_ROWS = 10_000;
    const where   = this.buildWhere(query);
    const orders = await this.prisma.order.findMany({
      where,
      take: MAX_ROWS,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { email: true } },
        items: {
          include: {
            tenant:  { select: { displayName: true } },
            variant: { include: { product: { select: { title: true } } } },
          },
        },
        shipments: { select: { carrier: true, trackingNumber: true }, take: 1 },
      },
    });

    const header = [
      'Order ID', 'Date', 'Customer Email', 'Status', 'Currency',
      'Gross', 'VAT', 'Mfg Cost', 'Vendor Total', 'Platform Total',
      'Vendors', 'Fulfilment Mix', 'Payment Ref', 'Invoice No',
      'Carrier', 'Tracking',
    ];
    const rows = orders.map((o) => {
      const dec = this.decoratedTotals(o.items);
      const vendors = Array.from(new Set(o.items.map((i) => i.tenant?.displayName).filter(Boolean))).join(' | ');
      const shipment = o.shipments[0];
      return [
        o.id,
        o.createdAt.toISOString(),
        o.customer?.email ?? '',
        o.status,
        o.currency,
        dec.gross.toFixed(2),
        dec.vat.toFixed(2),
        dec.mfg.toFixed(2),
        dec.vendor.toFixed(2),
        dec.platform.toFixed(2),
        vendors,
        dec.fulfilmentMix,
        o.paymentRef ?? '',
        o.invoiceNumber ?? '',
        shipment?.carrier ?? '',
        shipment?.trackingNumber ?? '',
      ];
    });

    // UTF-8 BOM so Excel opens the file with Turkish characters intact.
    const BOM = '﻿';
    const lines = [header, ...rows]
      .map((cols) => cols.map((c) => csvCell(c)).join(','))
      .join('\n');
    return BOM + lines + '\n';
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private buildWhere(query: TradeLedgerQueryDto): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};

    if (query.status) where.status = query.status;

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) (where.createdAt as any).gte = new Date(query.dateFrom);
      if (query.dateTo)   (where.createdAt as any).lte = endOfDay(query.dateTo);
    }

    // Tenant filter — must drill through items.
    if (query.tenantId || query.fulfilment) {
      where.items = {
        some: {
          ...(query.tenantId   && { tenantId:   query.tenantId }),
          ...(query.fulfilment && { fulfilment: query.fulfilment }),
        },
      };
    }

    if (query.hasReview === 'true' || query.hasReview === 'false') {
      // Customers can only review products they bought. Has-review = the
      // customer has at least one review on a product in this order's items.
      // Implemented as a customer-side correlated subquery via Prisma's
      // "every / some / none" semantics on the items relation.
      // For "false" we want orders where the customer has NO review on any
      // of their purchased products in this order — costly but acceptable
      // at admin-volume scale.
      const reviewMatchAny = {
        items: {
          some: {
            variant: {
              product: {
                reviews: {
                  some: {
                    customerId: { equals: undefined },  // bound below in two-step search
                  },
                },
              },
            },
          },
        },
      };
      // Two-step query is heavy here; we approximate with a second WHERE
      // executed against AuditLog/Review in a follow-up if performance matters.
      // Keep the filter pragmatic for now: only Yes is correlated, No is omitted.
      if (query.hasReview === 'true') {
        // We can't express "customer reviewed at least one of *their own* product
        // lines" in a single Prisma where, so we relax to "any review exists on a
        // product in this order" — a small over-match but acceptable for v1.
        where.items = {
          ...(where.items as object ?? {}),
          some: {
            ...(where.items as any)?.some,
            variant: { product: { reviews: { some: {} } } },
          },
        } as any;
      }
      void reviewMatchAny;
    }

    if (query.search && query.search.trim().length > 0) {
      const q = query.search.trim().slice(0, 100);
      where.OR = [
        { id:         { startsWith: q } },
        { paymentRef: { equals:     q } },
        { customer:   { email: { contains: q, mode: 'insensitive' } } },
        { shipments:  { some:  { trackingNumber: q } } },
      ];
    }

    return where;
  }

  private decoratedTotals(items: any[]) {
    let gross    = 0;
    let vat      = 0;
    let mfg      = 0;
    let vendor   = 0;
    let platform = 0;
    let hasVibehub = false;
    let hasVendor  = false;

    for (const it of items) {
      const lineTotal = Number(it.unitPriceSnapshot) * it.qty;
      gross  += lineTotal;
      vendor += Number(it.vendorPayoutAmount ?? 0);

      if (it.fulfilment === 'VIBEHUB_MANAGED') {
        hasVibehub = true;
        const cost     = Number(it.manufacturingCostSnapshot ?? 0);
        const platform_= Number(it.platformShareAmount ?? 0);
        // VAT residual = lineTotal − mfg − vendor − platform.
        const vatLine  = lineTotal - cost - Number(it.vendorPayoutAmount ?? 0) - platform_;
        mfg     += cost;
        platform += platform_;
        vat     += vatLine > 0 ? vatLine : 0;
      } else {
        hasVendor = true;
        // Lane 2 has no VAT/mfg snapshot — platform earns commission only.
        const commission = lineTotal - Number(it.vendorPayoutAmount ?? 0);
        platform += commission;
      }
    }

    let fulfilmentMix: 'VIBEHUB' | 'VENDOR' | 'BOTH' = 'VENDOR';
    if (hasVibehub && hasVendor) fulfilmentMix = 'BOTH';
    else if (hasVibehub)         fulfilmentMix = 'VIBEHUB';

    return { gross, vat, mfg, vendor, platform, fulfilmentMix };
  }

  private async decorate(order: any) {
    const totals = this.decoratedTotals(order.items);
    const vendors = Array.from(
      new Map((order.items as any[])
        .filter((i: any) => i.tenant)
        .map((i: any) => [i.tenant.id, { id: i.tenant.id, slug: i.tenant.slug, displayName: i.tenant.displayName }]),
      ).values(),
    );

    // Reviewability check: any review by this customer on any product in this order.
    const productIds = (order.items as any[])
      .map((i: any) => i.variant?.product?.id)
      .filter(Boolean) as string[];
    const hasReview = productIds.length > 0
      ? (await this.prisma.review.count({
          where: { customerId: order.customerId, productId: { in: productIds } },
        })) > 0
      : false;

    return {
      id:             order.id,
      createdAt:      order.createdAt,
      status:         order.status,
      currency:       order.currency,
      customer:       order.customer,
      paymentRef:     order.paymentRef,
      invoiceNumber:  order.invoiceNumber,
      vendors,
      money:          {
        gross:    +totals.gross.toFixed(2),
        vat:      +totals.vat.toFixed(2),
        mfg:      +totals.mfg.toFixed(2),
        vendor:   +totals.vendor.toFixed(2),
        platform: +totals.platform.toFixed(2),
      },
      fulfilmentMix:  totals.fulfilmentMix,
      shipments:      order.shipments ?? [],
      returnShipment: order.returnShipment ?? null,
      hasReview,
    };
  }
}

function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

function csvCell(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
