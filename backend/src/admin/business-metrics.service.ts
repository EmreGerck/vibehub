import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, TenantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface BusinessMetricsSnapshot {
  period: 'last_30d';
  generatedAt: string;
  gmv: { amount: number; currency: string; orderCount: number };
  activeVendors: number;
  vendorActivationRate: number;
  refundRate: number;
  cartAbandonment: number | 'unknown';
  avgTimeToFirstOrderDays: number | null;
}

/**
 * BusinessMetricsService
 * ----------------------
 * Last-30-day BI snapshot for the admin dashboard. Cached in-memory for 60s
 * to absorb refresh polling without hammering the DB. All queries are pure
 * Prisma — no raw SQL — so they stay typed across schema changes.
 *
 * Conventions:
 *   • GMV = sum(totalAmount) of orders in (DELIVERED, REFUND_REQUESTED, REFUNDED)
 *           — i.e. orders that completed checkout and the merchant has been or
 *           will be paid for. PLACED/CONFIRMED/SHIPPED count too since payment
 *           clears on PLACED → CONFIRMED.
 *   • activeVendors = distinct tenantId in OrderItem rows from DELIVERED orders
 *                     in the last 30 days.
 *   • vendorActivationRate = of tenants approved >30d ago, fraction that have
 *                            ever made a sale.
 *   • refundRate = REFUNDED / (DELIVERED + REFUNDED) in last 30d.
 *   • cartAbandonment = 'unknown' because Cart is Redis-only (no createdAt
 *                       persisted to Postgres). Returned as the literal string
 *                       'unknown' so the frontend can render a placeholder.
 *   • avgTimeToFirstOrderDays = for ALL currently-ACTIVE tenants (lifetime, not
 *                               period-scoped), average days between tenant
 *                               createdAt and their first OrderItem.createdAt.
 */
@Injectable()
export class BusinessMetricsService {
  private readonly logger = new Logger(BusinessMetricsService.name);
  private static readonly CACHE_TTL_MS = 60_000;

  private cache: { value: BusinessMetricsSnapshot; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getSnapshot(): Promise<BusinessMetricsSnapshot> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.value;
    }

    const value = await this.computeSnapshot();
    this.cache = { value, expiresAt: now + BusinessMetricsService.CACHE_TTL_MS };
    return value;
  }

  /**
   * Force a recompute on the next read — call after a big data change to
   * avoid a 60s stale window. Not wired to any route yet; available for
   * future admin "refresh" button.
   */
  invalidate(): void {
    this.cache = null;
  }

  private async computeSnapshot(): Promise<BusinessMetricsSnapshot> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      gmvAgg,
      gmvCount,
      currencySettings,
      activeVendorIds,
      eligibleTenantsCount,
      tenantsWithAnySale,
      deliveredCount30d,
      refundedCount30d,
      firstOrderStats,
    ] = await Promise.all([
      // GMV (sum of order totals) — completed checkout, last 30d
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: [
            OrderStatus.PLACED,
            OrderStatus.CONFIRMED,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
            OrderStatus.REFUND_REQUESTED,
            OrderStatus.REFUNDED,
          ] },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: [
            OrderStatus.PLACED,
            OrderStatus.CONFIRMED,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
            OrderStatus.REFUND_REQUESTED,
            OrderStatus.REFUNDED,
          ] },
        },
      }),
      // Platform currency from settings (singleton); fall back to TRY.
      this.prisma.platformSettings.findUnique({ where: { id: 'singleton' }, select: { currency: true } }),

      // Active vendors: distinct tenantId from OrderItem in delivered orders last 30d.
      this.prisma.orderItem.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          order: { status: OrderStatus.DELIVERED },
        },
        select: { tenantId: true },
        distinct: ['tenantId'],
      }),

      // Vendor activation denominator: ACTIVE tenants approved >30d ago
      // (proxy: tenant.createdAt < 30d ago AND status=ACTIVE).
      this.prisma.tenant.count({
        where: { status: TenantStatus.ACTIVE, createdAt: { lt: thirtyDaysAgo } },
      }),

      // Numerator: of those, how many have at least one sale ever.
      this.prisma.tenant.count({
        where: {
          status: TenantStatus.ACTIVE,
          createdAt: { lt: thirtyDaysAgo },
          orderItems: { some: {} },
        },
      }),

      // Refund-rate denominator pieces
      this.prisma.order.count({
        where: { createdAt: { gte: thirtyDaysAgo }, status: OrderStatus.DELIVERED },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: thirtyDaysAgo }, status: OrderStatus.REFUNDED },
      }),

      // Time-to-first-order: every ACTIVE tenant + its earliest OrderItem.
      // We use OrderItem.createdAt (per-vendor) not Order.createdAt because an
      // Order can span multiple vendors via OrderItem rows.
      this.prisma.tenant.findMany({
        where: { status: TenantStatus.ACTIVE },
        select: {
          id: true,
          createdAt: true,
          orderItems: {
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      }),
    ]);

    const currency = currencySettings?.currency ?? 'TRY';
    const gmvAmount = Number(gmvAgg._sum?.totalAmount ?? 0);

    const activeVendors = activeVendorIds.length;

    const vendorActivationRate = eligibleTenantsCount === 0
      ? 0
      : Number((tenantsWithAnySale / eligibleTenantsCount).toFixed(4));

    const refundDenom = deliveredCount30d + refundedCount30d;
    const refundRate = refundDenom === 0
      ? 0
      : Number((refundedCount30d / refundDenom).toFixed(4));

    // Cart is Redis-only (no createdAt persisted to Postgres). Returning
    // 'unknown' tells the frontend to render a "data not available" tile
    // instead of a misleading 0%.
    const cartAbandonment: number | 'unknown' = 'unknown';

    // avgTimeToFirstOrderDays — average over tenants that have any order.
    const diffs: number[] = [];
    for (const t of firstOrderStats) {
      const first = t.orderItems[0];
      if (!first) continue;
      const ms = first.createdAt.getTime() - t.createdAt.getTime();
      if (ms > 0) diffs.push(ms / (24 * 60 * 60 * 1000));
    }
    const avgTimeToFirstOrderDays = diffs.length === 0
      ? null
      : Number((diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1));

    return {
      period: 'last_30d',
      generatedAt: now.toISOString(),
      gmv: {
        amount: Number(gmvAmount.toFixed(2)),
        currency,
        orderCount: gmvCount,
      },
      activeVendors,
      vendorActivationRate,
      refundRate,
      cartAbandonment,
      avgTimeToFirstOrderDays,
    };
  }
}
