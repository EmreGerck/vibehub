import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/** Minimal HTML escape for email template interpolation. */
function escapeHtml(value: string | null | undefined): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sends transactional email via SMTP (nodemailer).
 * Falls back to logging the email body when SMTP_HOST is unset (local dev),
 * so the rest of the system doesn't need to special-case "no transport".
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port ?? 587,
        secure: (port ?? 587) === 465, // true for 465, false for 587 (STARTTLS)
        auth: { user, pass },
      });
      this.logger.log(`SMTP transport configured → ${host}:${port ?? 587}`);
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP_HOST / SMTP_USER / SMTP_PASS not set — emails will be logged to stdout instead of sent.',
      );
    }

    this.from = this.config.get<string>('MAIL_FROM') ?? 'VibeHub <info@vibehub.com.tr>';
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
    const shortId = orderId.slice(0, 8).toUpperCase();
    const subject = `VibeHub Siparişiniz Alındı — #${shortId}`;
    const html = this.orderEmailHtml(
      '🎉 Siparişiniz alındı!',
      `Sipariş numaranız: <strong>#${shortId}</strong><br/>Satıcı onayladıktan sonra kargoya verileceğini e-posta ile bildireceğiz.`,
      'Siparişlerimi Görüntüle',
      `https://vibehub.com.tr/profile/orders`,
    );
    await this.send(to, subject, html, `VibeHub siparişiniz alındı: #${shortId}`);
  }

  /**
   * Notify the platform admin of a new incoming order.
   * Fired from order.service.placeOrder right after the order row is created.
   * Recipient is PlatformSettings.orderNotificationEmail.
   */
  async sendAdminNewOrder(
    to: string,
    orderId: string,
    customerEmail: string,
    customerName: string | null,
    totalAmount: number,
    currency: string,
    itemCount: number,
    items: Array<{ title: string; qty: number }>,
  ): Promise<void> {
    const shortId = orderId.slice(0, 8).toUpperCase();
    const formattedTotal = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(totalAmount);
    const itemList = items.slice(0, 10).map((i) =>
      `<li style="padding:4px 0;color:#ddd;"><strong>${escapeHtml(i.title)}</strong> × ${i.qty}</li>`
    ).join('');
    const moreItems = items.length > 10 ? `<li style="color:#999;font-style:italic;">…ve ${items.length - 10} ürün daha</li>` : '';
    const subject = `🛒 Yeni sipariş — #${shortId} (${formattedTotal})`;
    const html = this.orderEmailHtml(
      '🛒 Yeni sipariş geldi!',
      `<strong>${formattedTotal}</strong> tutarında yeni bir sipariş alındı.<br/><br/>
      <strong>Sipariş ID:</strong> #${shortId}<br/>
      <strong>Müşteri:</strong> ${escapeHtml(customerName ?? customerEmail)} (<a href="mailto:${escapeHtml(customerEmail)}" style="color:#a855f7;">${escapeHtml(customerEmail)}</a>)<br/>
      <strong>Ürün sayısı:</strong> ${itemCount}<br/><br/>
      <strong>Ürünler:</strong>
      <ul style="margin:8px 0 16px;padding-left:20px;">${itemList}${moreItems}</ul>
      Bu siparişi onaylamak ve kargo oluşturmak için aşağıdaki bağlantıyı kullanın.`,
      'Admin Panelde Görüntüle',
      `https://vibehub.com.tr/dashboard/admin/orders?status=PLACED`,
    );
    await this.send(to, subject, html, `${formattedTotal} tutarında yeni sipariş: #${shortId}`);
  }

  /**
   * Notify a vendor that a new order containing their items has been placed.
   * One email per affected vendor — only their slice of the order.
   * Fired from order.service.placeOrder after the customer + admin notifications.
   */
  async sendVendorNewOrder(
    to: string,
    orderId: string,
    storeName: string,
    items: Array<{ title: string; qty: number; unitPrice: number }>,
    currency: string,
  ): Promise<void> {
    const shortId = orderId.slice(0, 8).toUpperCase();
    const vendorTotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const formattedTotal = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(vendorTotal);
    const itemList = items.slice(0, 10).map((i) =>
      `<li style="padding:4px 0;color:#ddd;"><strong>${escapeHtml(i.title)}</strong> × ${i.qty}</li>`
    ).join('');
    const moreItems = items.length > 10 ? `<li style="color:#999;font-style:italic;">…ve ${items.length - 10} ürün daha</li>` : '';
    const subject = `🎉 Yeni sipariş — #${shortId} (${formattedTotal})`;
    const html = this.orderEmailHtml(
      `🎉 ${escapeHtml(storeName)} için yeni sipariş!`,
      `<strong>${formattedTotal}</strong> tutarında bir sipariş aldın.<br/><br/>
      <strong>Sipariş ID:</strong> #${shortId}<br/><br/>
      <strong>Ürünler:</strong>
      <ul style="margin:8px 0 16px;padding-left:20px;">${itemList}${moreItems}</ul>
      Müşteri ödemeyi tamamladığında siparişi onaylayıp kargoya verebilirsin.`,
      'Sipariş Panelimde Aç',
      `https://vibehub.com.tr/dashboard/vendor/orders`,
    );
    await this.send(to, subject, html, `${formattedTotal} tutarında yeni sipariş: #${shortId}`);
  }

  /**
   * Notify a vendor that one of their orders had a refund requested by the customer.
   * Fired from order.service.requestRefund after the customer's confirmation email.
   */
  async sendVendorRefundRequest(
    to: string,
    orderId: string,
    storeName: string,
    customerName: string,
    reason: string,
  ): Promise<void> {
    const shortId = orderId.slice(0, 8).toUpperCase();
    const subject = `↩️ İade talebi — #${shortId}`;
    const html = this.orderEmailHtml(
      `↩️ ${escapeHtml(storeName)} — yeni iade talebi`,
      `<strong>${escapeHtml(customerName)}</strong> #${shortId} numaralı siparişin iadesini talep etti.<br/><br/>
      <strong>Müşterinin belirttiği neden:</strong><br/>
      <em style="color:#ccc;">"${escapeHtml(reason)}"</em><br/><br/>
      İade kararı platform admini tarafından verilecek — sen yalnızca bilgi amaçlı haberdar ediliyorsun.
      Yine de müşterinle iletişime geçmek istersen sipariş panelinden detayları görebilirsin.`,
      'Sipariş Detayını Gör',
      `https://vibehub.com.tr/dashboard/vendor/orders`,
    );
    await this.send(to, subject, html, `İade talebi geldi: #${shortId}`);
  }

  async sendOrderConfirmed(to: string, orderId: string): Promise<void> {
    const shortId = orderId.slice(0, 8).toUpperCase();
    const subject = `VibeHub Siparişiniz Onaylandı — #${shortId}`;
    const html = this.orderEmailHtml(
      '✅ Siparişiniz onaylandı!',
      `#${shortId} numaralı siparişiniz satıcı tarafından onaylandı ve hazırlanmaya başlandı. Kargoya verildiğinde tekrar bildirim alacaksınız.`,
      'Sipariş Durumunu Gör',
      `https://vibehub.com.tr/profile/orders`,
    );
    await this.send(to, subject, html, `Siparişiniz onaylandı: #${shortId}`);
  }

  async sendOrderDelivered(to: string, orderId: string): Promise<void> {
    const shortId = orderId.slice(0, 8).toUpperCase();
    const subject = `VibeHub Siparişiniz Teslim Edildi — #${shortId}`;
    const html = this.orderEmailHtml(
      '📦 Siparişiniz teslim edildi!',
      `#${shortId} numaralı siparişiniz teslim edildi. Ürünlerinizi beğendiyseniz yorum bırakarak sanatçıyı destekleyebilirsiniz.`,
      'Yorum Yaz',
      `https://vibehub.com.tr/profile/orders`,
    );
    await this.send(to, subject, html, `Siparişiniz teslim edildi: #${shortId}`);
  }

  async sendRefundRequested(to: string, orderId: string, reason: string): Promise<void> {
    const shortId = orderId.slice(0, 8).toUpperCase();
    const subject = `VibeHub İade Talebiniz Alındı — #${shortId}`;
    const html = this.orderEmailHtml(
      '↩️ İade talebiniz alındı',
      `#${shortId} numaralı siparişiniz için iade talebiniz başarıyla iletildi.<br/><br/>
      <strong>Belirttiğiniz neden:</strong><br/>
      <em style="color:#ccc;">"${reason}"</em><br/><br/>
      Ekibimiz 1-3 iş günü içinde talebinizi inceleyecek ve size bilgi verecektir.
      Onaylanması halinde ödemeniz orijinal ödeme yönteminize 5-10 iş günü içinde iade edilecektir.`,
      'Sipariş Durumumu Gör',
      `https://vibehub.com.tr/profile/orders/${orderId}`,
    );
    await this.send(to, subject, html, `İade talebiniz alındı: #${shortId}`);
  }

  async sendRefundApproved(to: string, orderId: string, amount: number, currency: string): Promise<void> {
    const shortId = orderId.slice(0, 8).toUpperCase();
    const formattedAmount = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(amount);
    const subject = `VibeHub İadeniz Onaylandı — #${shortId}`;
    const html = this.orderEmailHtml(
      '✅ İadeniz onaylandı!',
      `#${shortId} numaralı siparişinizin iade talebi onaylandı.<br/><br/>
      <strong style="color:#a855f7;font-size:20px;">${formattedAmount}</strong> tutarındaki iade,
      orijinal ödeme yönteminize <strong>5-10 iş günü</strong> içinde yansıyacaktır.<br/><br/>
      Banka işlem süreleri nedeniyle hesabınıza geçiş süresi değişiklik gösterebilir.
      Herhangi bir sorunuz için <a href="mailto:support@vibehub.com.tr" style="color:#a855f7;">support@vibehub.com.tr</a> adresine yazabilirsiniz.`,
      'Siparişlerime Dön',
      `https://vibehub.com.tr/profile/orders`,
    );
    await this.send(to, subject, html, `İadeniz onaylandı: ${formattedAmount} — #${shortId}`);
  }

  async sendRefundRejected(to: string, orderId: string, note: string): Promise<void> {
    const shortId = orderId.slice(0, 8).toUpperCase();
    const subject = `VibeHub İade Talebi Sonucu — #${shortId}`;
    const html = this.orderEmailHtml(
      '❌ İade talebi değerlendirilemedi',
      `#${shortId} numaralı siparişinizin iade talebi, aşağıdaki gerekçe nedeniyle onaylanamadı:<br/><br/>
      <div style="background:#1a1a2e;border-left:3px solid #ec4899;padding:12px 16px;border-radius:0 8px 8px 0;margin:8px 0 16px;">
        <em style="color:#ccc;">"${note}"</em>
      </div>
      Değerlendirmemizi haksız buluyorsanız veya ek bilgi sunmak istiyorsanız lütfen bize ulaşın:<br/>
      <a href="mailto:support@vibehub.com.tr" style="color:#a855f7;">support@vibehub.com.tr</a>`,
      'Destek ile İletişime Geç',
      `https://vibehub.com.tr/support`,
    );
    await this.send(to, subject, html, `İade talebi reddedildi: #${shortId}`);
  }

  async sendShipmentCreated(
    to: string,
    orderId: string,
    trackingNumber: string,
    carrier: string,
    estimatedDelivery?: Date,
  ): Promise<void> {
    const shortId       = orderId.slice(0, 8).toUpperCase();
    const carrierLabel  = carrier === 'aras' ? 'Aras Kargo' : carrier === 'yurtici' ? 'Yurtiçi Kargo' : carrier;
    const estLine       = estimatedDelivery
      ? `<br/>Tahmini teslimat tarihi: <strong>${estimatedDelivery.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</strong>`
      : '';
    const subject = `VibeHub Siparişiniz Kargoya Verildi — #${shortId}`;
    const html    = this.orderEmailHtml(
      '🚚 Siparişiniz yola çıktı!',
      `#${shortId} numaralı siparişiniz <strong>${carrierLabel}</strong> aracılığıyla kargoya verildi.<br/><br/>
      Kargo takip numaranız: <code style="background:#1a1a2e;padding:4px 10px;border-radius:6px;font-size:16px;letter-spacing:2px;">${trackingNumber}</code>${estLine}<br/><br/>
      Siparişinizin durumunu profilinizden takip edebilirsiniz.`,
      'Kargo Durumunu Takip Et',
      `https://vibehub.com.tr/profile/orders/${orderId}`,
    );
    await this.send(to, subject, html, `Siparişiniz kargoya verildi — #${shortId} / ${trackingNumber}`);
  }

  async sendReturnBarcode(
    to: string,
    orderId: string,
    returnBarcode: string,
    carrier: string,
  ): Promise<void> {
    const shortId      = orderId.slice(0, 8).toUpperCase();
    const carrierLabel = carrier === 'aras' ? 'Aras Kargo' : carrier === 'yurtici' ? 'Yurtiçi Kargo' : carrier;
    const subject      = `VibeHub İade Kargo Kodunuz — #${shortId}`;
    const html         = this.orderEmailHtml(
      '📦 İade kargo kodunuz hazır',
      `#${shortId} numaralı siparişiniz için iade kargo kodunuz:<br/><br/>
      <div style="text-align:center;margin:20px 0;">
        <div style="display:inline-block;background:#1a0533;border:2px solid #a855f7;border-radius:12px;padding:16px 32px;">
          <p style="margin:0 0 4px;font-size:12px;color:#a855f7;letter-spacing:1px;text-transform:uppercase;">İade Kargo Kodunuz</p>
          <p style="margin:0;font-size:28px;font-weight:800;letter-spacing:4px;color:#fff;font-family:monospace;">${returnBarcode}</p>
        </div>
      </div>
      <strong>Nasıl kullanılır?</strong><br/>
      1. Ürünü sağlam bir kutuda paketleyin.<br/>
      2. En yakın <strong>${carrierLabel}</strong> şubesine gidin.<br/>
      3. Şubedeki personele bu kodu gösterin: <strong>${returnBarcode}</strong><br/>
      4. Paketiniz VibeHub deposuna yönlendirilecektir.<br/><br/>
      Paketiniz depoya ulaştığında, ekibimiz ürünü inceleyerek iade işlemini gerçekleştirecektir.<br/>
      İade onaylandığında ödemeniz 5-10 iş günü içinde hesabınıza aktarılacaktır.`,
      'İade Durumumu Gör',
      `https://vibehub.com.tr/profile/orders/${orderId}`,
    );
    await this.send(to, subject, html, `İade kargo kodunuz: ${returnBarcode} — #${shortId}`);
  }

  private orderEmailHtml(title: string, body: string, ctaText: string, ctaUrl: string): string {
    return `
      <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#0B1022;color:#fff;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a0533,#2d0a4e);padding:32px 24px;text-align:center;">
          <h1 style="margin:0;font-size:28px;font-weight:800;background:linear-gradient(90deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">VibeHub</h1>
        </div>
        <div style="padding:32px 24px;">
          <h2 style="margin:0 0 16px;font-size:20px;">${title}</h2>
          <p style="margin:0 0 24px;color:#aaa;line-height:1.6;">${body}</p>
          <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(90deg,#a855f7,#ec4899);color:#fff;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:12px;">${ctaText}</a>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #222;text-align:center;">
          <p style="margin:0;font-size:11px;color:#555;">vibehub.com.tr · <a href="mailto:support@vibehub.com.tr" style="color:#555;">support@vibehub.com.tr</a></p>
        </div>
      </div>
    `.trim();
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

  async sendVendorApplicationReceived(to: string, displayName: string): Promise<void> {
    const subject = `VibeHub — Başvurunuz alındı`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0B1022;color:#fff;border-radius:12px;">
        <h1 style="margin:0 0 8px;font-size:20px;color:#fff;">Başvurunuz alındı!</h1>
        <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;">
          Merhaba, <strong style="color:#fff;">${escapeHtml(displayName)}</strong> mağazanız için VibeHub satıcı başvurunuz başarıyla iletildi.
        </p>
        <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;">
          Ekibimiz başvurunuzu en kısa sürede inceleyecek ve size e-posta ile geri dönecektir.
          Ortalama inceleme süresi <strong style="color:#fff;">1-3 iş günüdür</strong>.
        </p>
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">
          Herhangi bir sorunuz için <a href="mailto:support@vibehub.com.tr" style="color:#a855f7;">support@vibehub.com.tr</a> adresine yazabilirsiniz.
        </p>
      </div>
    `.trim();
    const text = `VibeHub satıcı başvurunuz alındı. Ekibimiz 1-3 iş günü içinde inceleyecek ve size dönecektir.`;
    await this.send(to, subject, html, text);
  }

  async sendAdminVendorApplied(to: string, tenantDisplayName: string, ownerEmail: string): Promise<void> {
    const subject = `[VibeHub] Yeni satıcı başvurusu — ${tenantDisplayName}`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0B1022;color:#fff;border-radius:12px;">
        <h1 style="margin:0 0 8px;font-size:20px;color:#fff;">Yeni satıcı başvurusu</h1>
        <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;">
          <strong style="color:#fff;">${escapeHtml(tenantDisplayName)}</strong> mağazası için yeni bir satıcı başvurusu alındı.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:120px;">Mağaza adı</td><td style="padding:6px 0;color:#fff;font-size:13px;">${escapeHtml(tenantDisplayName)}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">E-posta</td><td style="padding:6px 0;color:#fff;font-size:13px;">${escapeHtml(ownerEmail)}</td></tr>
        </table>
        <a href="https://vibehub.com.tr/dashboard/admin/vendors"
           style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-size:15px;">
          Başvuruyu İncele
        </a>
      </div>
    `.trim();
    const text = `Yeni satıcı başvurusu: ${tenantDisplayName} (${ownerEmail}). İncelemek için: https://vibehub.com.tr/dashboard/admin/vendors`;
    await this.send(to, subject, html, text);
  }

  async sendVendorRejected(to: string, tenantDisplayName: string, reason?: string): Promise<void> {
    const subject = `VibeHub — Satıcı başvurusu sonucu`;
    const reasonSection = reason
      ? `<p style="margin:0 0 16px;color:#94a3b8;font-size:14px;"><strong style="color:#fff;">Değerlendirme notu:</strong><br/><em style="color:#ccc;">"${escapeHtml(reason)}"</em></p>`
      : '';
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0B1022;color:#fff;border-radius:12px;">
        <h1 style="margin:0 0 8px;font-size:20px;color:#fff;">Başvurunuz değerlendirildi</h1>
        <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;">
          Merhaba, <strong style="color:#fff;">${escapeHtml(tenantDisplayName)}</strong> mağazanız için yaptığınız başvuruyu inceledik.
          Maalesef bu aşamada başvurunuzu onaylayamıyoruz.
        </p>
        ${reasonSection}
        <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;">
          Koşullarınız değiştiğinde tekrar başvurabilirsiniz. Sorularınız için
          <a href="mailto:support@vibehub.com.tr" style="color:#a855f7;">support@vibehub.com.tr</a> adresine yazabilirsiniz.
        </p>
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">VibeHub ekibi</p>
      </div>
    `.trim();
    const text = reason
      ? `VibeHub satıcı başvurunuz bu aşamada onaylanamadı. Değerlendirme notu: "${reason}"`
      : `VibeHub satıcı başvurunuz bu aşamada onaylanamadı.`;
    await this.send(to, subject, html, text);
  }

  /** Generic send for one-off emails (contact form, admin notifications, etc.) */
  async sendGeneric(to: string, subject: string, html: string, text = ''): Promise<void> {
    return this.send(to, subject, html, text || subject);
  }

  private async send(to: string, subject: string, html: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[MAIL fallback] to=${to} subject="${subject}"\n${text}`);
      return;
    }
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text,
      });
      this.logger.log(`[MAIL] sent to=${to} messageId=${info.messageId} subject="${subject}"`);
    } catch (err: any) {
      this.logger.error(`SMTP send failed to ${to}: ${err.message}`);
      throw new Error(`Email send failed: ${err.message}`);
    }
  }
}
