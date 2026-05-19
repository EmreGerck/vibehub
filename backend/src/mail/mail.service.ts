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
