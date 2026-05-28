import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AuditRetentionService
 * ---------------------
 * Monthly job that enforces a 12-month retention window on the AuditLog table.
 * Without this, AuditLog grows linearly forever — at ~10k rows/day after launch
 * that becomes a multi-million-row table in 1 year, which slows down every
 * security-monitor / forensic query.
 *
 * Runs on the 1st of every month at 04:00 UTC (slack hour for our TR audience).
 *
 * ─── Retention policy ────────────────────────────────────────────────────────
 * Current policy: HARD DELETE rows older than 12 months.
 *
 * To switch to ANONYMIZE for KVKK / GDPR-friendlier compliance (keep
 * action + targetType + createdAt for forensic stats, clear actorId + metadata):
 * change the implementation in `pruneOldLogs()` from `prisma.auditLog.deleteMany`
 * to `prisma.auditLog.updateMany` with `{ actorId: null, metadata: {} }`.
 * Both approaches are KVKK-defensible; hard-delete is simpler and matches
 * the "12 months" wording in our privacy policy.
 */
@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);
  private static readonly RETENTION_MONTHS = 12;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Monthly retention job. 1st of every month at 04:00 UTC.
   * The try/catch ensures one bad run never crashes the global scheduler
   * (which would also stop unrelated cron jobs like the security digest).
   */
  @Cron('0 4 1 * *', {
    name: 'audit-log-retention',
    timeZone: 'UTC',
  })
  async runMonthlyPrune(): Promise<void> {
    this.logger.log('[AuditRetention] Starting monthly prune...');
    try {
      const deleted = await this.pruneOldLogs();
      this.logger.log(`[AuditRetention] Pruned ${deleted} audit-log rows older than ${AuditRetentionService.RETENTION_MONTHS} months.`);
    } catch (err: any) {
      // Swallowed on purpose — a single failed cron run must NOT throw out of
      // the scheduler, otherwise other cron jobs (security digest, etc.) stop firing.
      this.logger.error(`[AuditRetention] Monthly prune failed: ${err?.message ?? err}`);
    }
  }

  /**
   * Delete every AuditLog row whose createdAt is older than the retention window.
   * Returns the number of rows removed.
   *
   * Exposed as a public method so ops can trigger an ad-hoc prune from a
   * future admin endpoint or one-off script if needed.
   */
  async pruneOldLogs(): Promise<number> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - AuditRetentionService.RETENTION_MONTHS);

    // To switch to anonymize-instead-of-delete (KVKK-friendlier), replace this
    // block with:
    //   const { count } = await this.prisma.auditLog.updateMany({
    //     where: { createdAt: { lt: cutoff }, actorId: { not: null } },
    //     data:  { actorId: null, metadata: {} },
    //   });
    const { count } = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return count;
  }
}
