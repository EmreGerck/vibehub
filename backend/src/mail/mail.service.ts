import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/**
 * Thin wrapper around Resend. Falls back to logging the email body when
 * RESEND_API_KEY is unset (local dev), so the rest of the system doesn't
 * need to special-case "no transport".
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('RESEND_API_KEY');
    this.resend = key ? new Resend(key) : null;
    this.from = this.config.get<string>('MAIL_FROM') ?? 'VibeHub <onboarding@resend.dev>';
    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY not set — emails will be logged to stdout instead of sent.',
      );
    }
  }

  async sendOtp(to: string, code: string, ttlSeconds: number): Promise<void> {
    const subject = `Your VibeHub verification code: ${code}`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0B1022;color:#fff;border-radius:12px;">
        <h1 style="margin:0 0 8px;font-size:20px;color:#fff;">VibeHub sign-in</h1>
        <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;">Use this code to finish signing in.</p>
        <div style="font-size:36px;letter-spacing:8px;font-weight:700;text-align:center;padding:20px;background:#070A12;border-radius:8px;color:#fff;">
          ${code}
        </div>
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">
          Expires in ${Math.round(ttlSeconds / 60)} minute${ttlSeconds >= 120 ? 's' : ''}.
          If you didn't try to sign in, you can ignore this email.
        </p>
      </div>
    `.trim();
    const text = `Your VibeHub verification code is ${code}. Expires in ${Math.round(ttlSeconds / 60)} minutes.`;

    await this.send(to, subject, html, text);
  }

  async sendVendorWelcome(to: string, tenantDisplayName: string): Promise<void> {
    const subject = `${tenantDisplayName} is approved on VibeHub`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <h1 style="margin:0 0 8px;">Your store is live</h1>
        <p>${tenantDisplayName} is now approved on VibeHub. You can sign in to your dashboard and start uploading products.</p>
      </div>
    `.trim();
    const text = `${tenantDisplayName} is approved on VibeHub. Sign in to your dashboard to start uploading products.`;

    await this.send(to, subject, html, text);
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const subject = 'Reset your VibeHub password';
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0B1022;color:#fff;border-radius:12px;">
        <h1 style="margin:0 0 8px;font-size:20px;color:#fff;">Password reset</h1>
        <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;">
          We received a request to reset your password. Click the button below — this link expires in 1 hour.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-size:15px;">
          Reset password
        </a>
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
      </div>
    `.trim();
    const text = `Reset your VibeHub password by visiting: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`;

    await this.send(to, subject, html, text);
  }

  async sendShipmentNotification(
    to: string,
    orderId: string,
    trackingNumber: string | null,
    carrier: string | null,
  ): Promise<void> {
    const subject = `Your VibeHub order is on its way!`;
    const trackingLine = trackingNumber
      ? `<p>Tracking number: <strong>${trackingNumber}</strong>${carrier ? ` (${carrier})` : ''}</p>`
      : '<p>Your package has been handed to the carrier.</p>';
    const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0B1022;color:#fff;border-radius:12px;">
      <h1 style="margin:0 0 8px;font-size:20px;">📦 Your order shipped!</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 16px;">Order <strong style="color:#fff;">#${orderId.slice(0, 8).toUpperCase()}</strong> is on its way.</p>
      ${trackingLine.replace('style=""', 'style="color:#94a3b8;font-size:14px;"')}
      <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;">Thank you for shopping on VibeHub!</p>
    </div>
  `.trim();
    const text = trackingNumber
      ? `Your order ${orderId} shipped. Tracking: ${trackingNumber}${carrier ? ` via ${carrier}` : ''}.`
      : `Your order ${orderId} has shipped.`;

    await this.send(to, subject, html, text);
  }

  async sendSecurityAlert(to: string, lockoutMinutes: number): Promise<void> {
    const subject = 'VibeHub — Suspicious login activity detected';
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0B1022;color:#fff;border-radius:12px;">
        <h1 style="margin:0 0 8px;font-size:20px;color:#fff;">⚠️ Security Alert</h1>
        <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;">
          Multiple failed login attempts were detected on your VibeHub account.
          Your account has been temporarily locked for <strong style="color:#fff;">${lockoutMinutes} minute(s)</strong>.
        </p>
        <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;">
          If this was you, please wait and try again later.
          If you did not attempt to log in, consider resetting your password immediately.
        </p>
        <a href="${this.config.get('FRONTEND_URL') ?? 'https://vibehub.com.tr'}/auth/forgot-password"
           style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-size:15px;">
          Reset my password
        </a>
      </div>
    `.trim();
    const text = `Multiple failed login attempts locked your VibeHub account for ${lockoutMinutes} min. If this wasn't you, reset your password.`;
    await this.send(to, subject, html, text);
  }

  /**
   * Sent to the customer when a pre-order line item is approved by admin.
   * `shipDate` is the estimated ship date (may be null if unknown).
   */
  async sendPreOrderApproved(
    to: string,
    args: {
      orderId: string;
      productTitle: string;
      qty: number;
      shipDate?: Date | null;
      orderUrl?: string;
    },
  ): Promise<void> {
    const shipText = args.shipDate
      ? `<p>Estimated ship date: <strong>${args.shipDate.toDateString()}</strong></p>`
      : '';
    const cta = args.orderUrl
      ? `<p><a href="${args.orderUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">View order</a></p>`
      : '';
    const subject = `Your pre-order is confirmed — ${args.productTitle}`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <h1 style="margin:0 0 8px;">Your pre-order is confirmed 🎉</h1>
        <p>We've approved your pre-order for <strong>${args.productTitle}</strong> (×${args.qty}).</p>
        ${shipText}
        <p>You'll receive a shipping notification with tracking info as soon as your order is on its way.</p>
        ${cta}
        <p style="color:#888;font-size:12px;margin-top:24px;">VibeHub · order ${args.orderId.slice(0, 8).toUpperCase()}</p>
      </div>
    `.trim();
    const text = `Your VibeHub pre-order for "${args.productTitle}" (×${args.qty}) has been approved. ${
      args.shipDate ? `Estimated ship date: ${args.shipDate.toDateString()}.` : ''
    } We'll email you again when it ships.`;
    await this.send(to, subject, html, text);
  }

  async sendOrderConfirmation(to: string, orderId: string): Promise<void> {
    const subject = `VibeHub order ${orderId.slice(0, 8).toUpperCase()} confirmed`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <h1 style="margin:0 0 8px;">Thanks for your order</h1>
        <p>We received your order <strong>${orderId}</strong> and will email you again when it ships.</p>
      </div>
    `.trim();
    const text = `Thanks — we received your VibeHub order ${orderId}.`;

    await this.send(to, subject, html, text);
  }

  /**
   * Daily security digest — sent to all platform admins every morning.
   * Shows threat summary, brute-force targets, account lockouts, and system health.
   */
  async sendDailySecurityDigest(
    to: string | string[],
    report: {
      date: string;
      threatLevel: 'low' | 'medium' | 'high' | 'critical';
      failedLogins1h: number;
      failedLogins24h: number;
      accountLocks24h: number;
      passwordResets24h: number;
      totalUsersLocked: number;
      bruteForceTargets: { targetId: string; attempts: number }[];
      systemHealth: Record<string, { ok: boolean; latencyMs?: number; detail?: string }>;
      topEvents: { action: string; actorEmail: string; targetId: string; createdAt: string; severity: string }[];
    },
  ): Promise<void> {
    const THREAT_COLOR: Record<string, string> = {
      low:      '#16a34a',
      medium:   '#d97706',
      high:     '#ea580c',
      critical: '#dc2626',
    };
    const THREAT_LABEL: Record<string, string> = {
      low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL',
    };
    const SEV_ICON: Record<string, string> = { info: 'ℹ️', warning: '⚠️', critical: '🚨' };

    const threatColor = THREAT_COLOR[report.threatLevel] ?? '#6b7280';
    const threatLabel = THREAT_LABEL[report.threatLevel] ?? report.threatLevel.toUpperCase();
    const hasAlerts   = report.accountLocks24h > 0 || report.bruteForceTargets.length > 0 || report.threatLevel !== 'low';

    const bruteForceRows = report.bruteForceTargets.length
      ? report.bruteForceTargets.map(t =>
          `<tr>
            <td style="padding:6px 8px;font-family:monospace;font-size:13px;color:#1e293b;">${t.targetId}</td>
            <td style="padding:6px 8px;text-align:right;font-weight:700;color:#dc2626;">${t.attempts} girişim</td>
          </tr>`,
        ).join('')
      : '<tr><td colspan="2" style="padding:8px;color:#64748b;font-size:13px;">Brute-force hedefi tespit edilmedi ✅</td></tr>';

    const eventRows = report.topEvents.slice(0, 10).map(e =>
      `<tr>
        <td style="padding:5px 8px;font-size:12px;">${SEV_ICON[e.severity] ?? ''}</td>
        <td style="padding:5px 8px;font-size:12px;color:#374151;">${e.action}</td>
        <td style="padding:5px 8px;font-size:12px;font-family:monospace;color:#374151;">${e.actorEmail}</td>
        <td style="padding:5px 8px;font-size:12px;color:#9ca3af;">${new Date(e.createdAt).toLocaleTimeString('tr-TR')}</td>
      </tr>`,
    ).join('');

    const healthRows = Object.entries(report.systemHealth).map(([key, h]) => {
      const label = { database: 'Veritabanı', orderProcessing: 'Sipariş İşleme', payouts: 'Ödemeler' }[key] ?? key;
      return `<tr>
        <td style="padding:5px 8px;font-size:13px;">${h.ok ? '✅' : '❌'} ${label}</td>
        <td style="padding:5px 8px;font-size:12px;color:#6b7280;">${h.latencyMs !== undefined ? `${h.latencyMs}ms` : h.detail ?? ''}</td>
      </tr>`;
    }).join('');

    const subject = `${hasAlerts ? '🚨 ' : '🛡️ '}Güvenlik Raporu — ${report.date} [${threatLabel}]`;
    const html = `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;">

  <!-- Header -->
  <div style="background:#0b1022;border-radius:12px;padding:24px 28px;margin-bottom:20px;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:20px;font-weight:700;color:#fff;">🛡️ VibeHub Güvenlik Raporu</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:4px;">${report.date}</div>
      </div>
      <div style="background:${threatColor};color:#fff;font-weight:700;font-size:13px;padding:6px 16px;border-radius:999px;letter-spacing:0.05em;">
        ${threatLabel}
      </div>
    </div>
  </div>

  <!-- Stats grid -->
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px;">
    ${[
      ['Başarısız Giriş (1s)',  report.failedLogins1h,  report.failedLogins1h >= 5],
      ['Başarısız Giriş (24s)', report.failedLogins24h, report.failedLogins24h >= 20],
      ['Hesap Kilitleme (24s)', report.accountLocks24h, report.accountLocks24h >= 1],
      ['Şifre Sıfırlama (24s)', report.passwordResets24h, false],
      ['Aktif Kilitli Hesap',   report.totalUsersLocked, report.totalUsersLocked >= 1],
      ['Brute Force Hedefi',    report.bruteForceTargets.length, report.bruteForceTargets.length > 0],
    ].map(([label, value, alert]) => `
      <div style="background:${alert ? '#fef2f2' : '#fff'};border:1px solid ${alert ? '#fecaca' : '#e2e8f0'};border-radius:10px;padding:14px 16px;">
        <div style="font-size:22px;font-weight:700;color:${alert ? '#dc2626' : '#1e293b'};">${value}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">${label}</div>
      </div>
    `).join('')}
  </div>

  <!-- Brute force targets -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:16px;overflow:hidden;">
    <div style="background:#fef2f2;border-bottom:1px solid #fecaca;padding:10px 16px;">
      <strong style="font-size:13px;color:#991b1b;">💣 Brute Force Hedefleri (Son 1 Saat)</strong>
    </div>
    <table style="width:100%;border-collapse:collapse;">${bruteForceRows}</table>
  </div>

  <!-- System health -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:16px;overflow:hidden;">
    <div style="background:#f1f5f9;border-bottom:1px solid #e2e8f0;padding:10px 16px;">
      <strong style="font-size:13px;color:#1e293b;">🖥️ Sistem Sağlığı</strong>
    </div>
    <table style="width:100%;border-collapse:collapse;">${healthRows}</table>
  </div>

  <!-- Recent events -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:16px;overflow:hidden;">
    <div style="background:#f1f5f9;border-bottom:1px solid #e2e8f0;padding:10px 16px;">
      <strong style="font-size:13px;color:#1e293b;">📋 Son 10 Güvenlik Olayı</strong>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <tr style="background:#f8fafc;">
        <th style="padding:6px 8px;text-align:left;color:#64748b;">Sev.</th>
        <th style="padding:6px 8px;text-align:left;color:#64748b;">Olay</th>
        <th style="padding:6px 8px;text-align:left;color:#64748b;">Kullanıcı</th>
        <th style="padding:6px 8px;text-align:left;color:#64748b;">Saat</th>
      </tr>
      ${eventRows || '<tr><td colspan="4" style="padding:8px;color:#64748b;">Son 24 saatte güvenlik olayı yok</td></tr>'}
    </table>
  </div>

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:20px;">
    <a href="${process.env.FRONTEND_URL ?? 'https://vibehub.io'}/dashboard/admin/security"
       style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;">
      Güvenlik Monitörünü Aç →
    </a>
  </div>

  <div style="text-align:center;font-size:11px;color:#94a3b8;">
    Bu rapor her gün sabah 08:00'de otomatik olarak gönderilmektedir.<br>
    VibeHub Platform · ${report.date}
  </div>
</div>
    `.trim();

    const text = [
      `VibeHub Güvenlik Raporu — ${report.date}`,
      `Tehdit Seviyesi: ${threatLabel}`,
      `Başarısız Giriş (1s): ${report.failedLogins1h}`,
      `Başarısız Giriş (24s): ${report.failedLogins24h}`,
      `Hesap Kilitleme (24s): ${report.accountLocks24h}`,
      `Brute Force Hedefi: ${report.bruteForceTargets.length}`,
      `Kilitli Hesap: ${report.totalUsersLocked}`,
      '',
      'Sistem Sağlığı:',
      ...Object.entries(report.systemHealth).map(([k, h]) => `  ${h.ok ? '✓' : '✗'} ${k}: ${h.detail ?? `${h.latencyMs}ms`}`),
    ].join('\n');

    const recipients = Array.isArray(to) ? to : [to];
    for (const recipient of recipients) {
      await this.send(recipient, subject, html, text);
    }
  }

  private async send(to: string, subject: string, html: string, text: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[MAIL fallback] to=${to} subject="${subject}"\n${text}`);
      return;
    }
    const result = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
      text,
    });
    if (result.error) {
      this.logger.error(
        `Resend send failed to ${to}: ${result.error.name} - ${result.error.message}`,
      );
      throw new Error(`Email send failed: ${result.error.message}`);
    }
    this.logger.log(`[MAIL] sent to=${to} id=${result.data?.id} subject="${subject}"`);
  }
}
