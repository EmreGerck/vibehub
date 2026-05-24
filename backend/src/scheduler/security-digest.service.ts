import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AdminService } from '../admin/admin.service';

/**
 * SecurityDigestService
 * ---------------------
 * Runs a cron job every day at 08:00 (Istanbul / UTC+3, so 05:00 UTC).
 * Fetches a full security overview from AdminService and emails it to all
 * platform admins (PLATFORM_ADMIN + GOD_USER roles).
 *
 * Also exposes sendNow() so the admin can trigger an ad-hoc report from the panel.
 */
@Injectable()
export class SecurityDigestService {
  private readonly logger = new Logger(SecurityDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly adminService: AdminService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Daily digest — 08:00 Istanbul (05:00 UTC).
   * Change the cron expression in .env via SECURITY_DIGEST_CRON if needed.
   */
  @Cron(process.env.SECURITY_DIGEST_CRON ?? '0 5 * * *', {
    name: 'security-daily-digest',
    timeZone: 'UTC',
  })
  async runDailyDigest(): Promise<void> {
    this.logger.log('[SecurityDigest] Starting daily digest...');
    try {
      await this.sendDigest();
      this.logger.log('[SecurityDigest] Daily digest sent successfully.');
    } catch (err) {
      this.logger.error(`[SecurityDigest] Failed to send daily digest: ${err.message}`);
    }
  }

  /**
   * Trigger an immediate digest (called from admin panel or ad-hoc scripts).
   */
  async sendNow(): Promise<{ sent: number; recipients: string[] }> {
    this.logger.log('[SecurityDigest] Ad-hoc digest triggered');
    return this.sendDigest();
  }

  // ─── Core logic ──────────────────────────────────────────────────────────────

  private async sendDigest(): Promise<{ sent: number; recipients: string[] }> {
    // 1. Gather admin recipients
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['PLATFORM_ADMIN', 'GOD_USER'] } },
      select: { email: true },
    });

    // Also include the explicit override list from env (comma-separated)
    const envRecipients = (this.config.get<string>('SECURITY_DIGEST_EMAILS') ?? '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);

    const allEmails = [...new Set([...admins.map(a => a.email), ...envRecipients])];

    if (allEmails.length === 0) {
      this.logger.warn('[SecurityDigest] No admin recipients found — skipping.');
      return { sent: 0, recipients: [] };
    }

    // 2. Fetch security overview
    const overview = await this.adminService.getSecurityOverview();

    // 3. Build the report payload for the mail template
    const date = new Date().toLocaleDateString('tr-TR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    await this.mail.sendDailySecurityDigest(allEmails, {
      date,
      threatLevel:       overview.threatLevel,
      failedLogins1h:    overview.summary.failedLogins1h,
      failedLogins24h:   overview.summary.failedLogins24h,
      accountLocks24h:   overview.summary.accountLocks24h,
      passwordResets24h: overview.summary.passwordResets24h,
      totalUsersLocked:  overview.summary.totalUsersLocked,
      bruteForceTargets: overview.summary.bruteForceTargets,
      systemHealth:      overview.systemHealth,
      topEvents:         overview.recentEvents.slice(0, 10).map(e => ({
        action:     e.action,
        actorEmail: e.actorEmail,
        targetId:   e.targetId,
        createdAt:  e.createdAt as unknown as string,
        severity:   e.severity,
      })),
    });

    return { sent: allEmails.length, recipients: allEmails };
  }
}
