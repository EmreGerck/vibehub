import { Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import { MailService } from '../mail/mail.service';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSent: number;
}

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

const OTP_TTL_MS = 5 * 60 * 1000;           // 5 minutes
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;       // 30 s
const LOGIN_RATE_LIMIT = 5;                 // 5 failed attempts
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otps = new Map<string, OtpRecord>();
  private readonly loginAttempts = new Map<string, RateLimitRecord>();

  constructor(private readonly mail: MailService) {}

  /** Generate, store, and email a 6-digit OTP to the given email. */
  async issueOtp(email: string): Promise<{ code: string; expiresAt: number; cooldownUntil: number }> {
    const existing = this.otps.get(email);
    const now = Date.now();
    if (existing && now - existing.lastSent < RESEND_COOLDOWN_MS) {
      // Don't regenerate — return existing
      return {
        code: existing.code,
        expiresAt: existing.expiresAt,
        cooldownUntil: existing.lastSent + RESEND_COOLDOWN_MS,
      };
    }

    const code = randomInt(100000, 1000000).toString();
    const record: OtpRecord = {
      code,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      lastSent: now,
    };
    this.otps.set(email, record);

    this.logger.log(`[OTP] ${email} → ${code} (expires in ${OTP_TTL_MS / 1000}s)`);
    await this.mail.sendOtp(email, code, OTP_TTL_MS / 1000);

    return {
      code,
      expiresAt: record.expiresAt,
      cooldownUntil: now + RESEND_COOLDOWN_MS,
    };
  }

  /**
   * Verify the OTP. Returns true on success and consumes the record.
   * Throws-style failure modes are signalled via the return shape so the
   * caller can pick the right HTTP error.
   */
  verifyOtp(email: string, code: string): { ok: boolean; reason?: 'missing' | 'expired' | 'mismatch' | 'too-many-attempts' } {
    const record = this.otps.get(email);
    if (!record) return { ok: false, reason: 'missing' };

    if (Date.now() > record.expiresAt) {
      this.otps.delete(email);
      return { ok: false, reason: 'expired' };
    }

    record.attempts += 1;
    if (record.attempts > OTP_MAX_ATTEMPTS) {
      this.otps.delete(email);
      return { ok: false, reason: 'too-many-attempts' };
    }

    if (record.code !== code) return { ok: false, reason: 'mismatch' };

    this.otps.delete(email);
    return { ok: true };
  }

  /** Returns ms remaining in resend cooldown, or 0 if the user may resend now. */
  resendCooldownRemaining(email: string): number {
    const r = this.otps.get(email);
    if (!r) return 0;
    return Math.max(0, r.lastSent + RESEND_COOLDOWN_MS - Date.now());
  }

  // ─── Login rate limiting ─────────────────────────────────────────────────

  /** Throws-free check. Returns true if the email is currently rate-limited. */
  isLoginRateLimited(email: string): boolean {
    const r = this.loginAttempts.get(email);
    if (!r) return false;
    if (Date.now() - r.windowStart > LOGIN_RATE_WINDOW_MS) {
      this.loginAttempts.delete(email);
      return false;
    }
    return r.count >= LOGIN_RATE_LIMIT;
  }

  recordFailedLogin(email: string): void {
    const r = this.loginAttempts.get(email);
    const now = Date.now();
    if (!r || now - r.windowStart > LOGIN_RATE_WINDOW_MS) {
      this.loginAttempts.set(email, { count: 1, windowStart: now });
    } else {
      r.count += 1;
    }
  }

  resetLoginAttempts(email: string): void {
    this.loginAttempts.delete(email);
  }
}
