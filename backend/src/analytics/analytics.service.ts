import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { UAParser } from 'ua-parser-js';

/**
 * Page-view analytics — what devices/browsers customers use.
 * Fire-and-forget; never blocks the request.
 *
 * Records minimal data:
 *   - hashed IP (SHA-256, truncated 16 chars) — privacy-preserving
 *   - parsed user agent (brand/model/os/browser)
 *   - path + referer
 *   - userId if authenticated
 *
 * The admin dashboard groups by deviceBrand/deviceModel/os to surface
 * "what phones do my customers actually have?"
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Record a page view. Fire-and-forget — failures are silently logged. */
  async record(input: {
    userAgent?: string;
    ip?: string;
    path: string;
    referer?: string;
    userId?: string | null;
  }): Promise<void> {
    try {
      const parsed = input.userAgent ? new UAParser(input.userAgent).getResult() : null;
      const ipHash = input.ip
        ? crypto.createHash('sha256').update(input.ip).digest('hex').slice(0, 16)
        : null;

      await (this.prisma as any).pageView.create({
        data: {
          ipHash,
          browser: parsed?.browser?.name?.slice(0, 50) ?? null,
          browserVer: parsed?.browser?.version?.slice(0, 30) ?? null,
          os: parsed?.os?.name?.slice(0, 50) ?? null,
          osVer: parsed?.os?.version?.slice(0, 30) ?? null,
          deviceType: parsed?.device?.type ?? 'desktop',
          deviceBrand: parsed?.device?.vendor?.slice(0, 50) ?? null,
          deviceModel: parsed?.device?.model?.slice(0, 80) ?? null,
          path: input.path.slice(0, 500),
          referer: input.referer?.slice(0, 500) ?? null,
          userId: input.userId ?? null,
        },
      });
    } catch (err: any) {
      // Analytics failure must never affect the user request
      this.logger.warn(`[Analytics] record failed: ${err?.message ?? err}`);
    }
  }

  /**
   * Admin dashboard: top device brands + models in the last N days.
   * Returns counts grouped by brand and by model.
   */
  async getDeviceBreakdown(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalViews, byBrand, byModel, byOs, byDeviceType] = await Promise.all([
      (this.prisma as any).pageView.count({ where: { createdAt: { gte: since } } }),
      (this.prisma as any).pageView.groupBy({
        by: ['deviceBrand'],
        _count: { _all: true },
        where: {
          createdAt: { gte: since },
          deviceBrand: { not: null },
        },
        take: 20,
      }),
      (this.prisma as any).pageView.groupBy({
        by: ['deviceBrand', 'deviceModel'],
        _count: { _all: true },
        where: {
          createdAt: { gte: since },
          deviceModel: { not: null },
        },
        take: 30,
      }),
      (this.prisma as any).pageView.groupBy({
        by: ['os'],
        _count: { _all: true },
        where: {
          createdAt: { gte: since },
          os: { not: null },
        },
        take: 10,
      }),
      (this.prisma as any).pageView.groupBy({
        by: ['deviceType'],
        _count: { _all: true },
        where: { createdAt: { gte: since } },
        take: 10,
      }),
    ]);

    // Sort + normalize each grouping
    const normalize = (rows: any[], labelKeys: string[]) =>
      rows
        .map((r) => ({
          label: labelKeys.map((k) => r[k]).filter(Boolean).join(' '),
          count: r._count?._all ?? 0,
        }))
        .sort((a, b) => b.count - a.count)
        .filter((r) => r.label.trim().length > 0);

    return {
      windowDays: days,
      totalViews,
      brands: normalize(byBrand, ['deviceBrand']),
      models: normalize(byModel, ['deviceBrand', 'deviceModel']),
      operatingSystems: normalize(byOs, ['os']),
      deviceTypes: normalize(byDeviceType, ['deviceType']),
    };
  }
}
