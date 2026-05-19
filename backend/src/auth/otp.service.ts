import { Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import { MailService } from '../mail/mail.service';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSent: number;
}

interface LoginAttemptRecord {
  count: number;
  windowStart: number;
  lockedUntil: number; // epoch ms — 0 means not locked
}

const OTP_TTL_MS = 5 * 60 * 1000;           // 5 minutes
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;       // 30 s
const LOGIN_RATE_LIMIT = 5;                 // attempts before first lockout
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;

// Exponential lockout durations after exceeding LOGIN_RATE_LIMIT
const LOCKOUT_DURATIONS_MS = [
  1  * 60 * 1000,   // 1st lockout: 1 min
  5  * 60 * 1000,   // 2nd: 5 min
  15 * 60 * 1000,   // 3rd: 15 min
  60 * 60 * 1000,   // 4th+: 1 hour
];

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otps = new Map<string, OtpRecord>();
  private readonly loginAttempts = new Map<string, LoginAttemptRecord>();

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

    // Never log OTP codes in production — logs may be shipped to external services
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[OTP-DEV] ${email} → ${code} (ttl=${OTP_TTL_MS / 1000}s)`);
    } else {
      this.logger.log(`[OTP] Issued for ${email} (ttl=${OTP_TTL_MS / 1000}s)`);
    }
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

  // ─── Login rate limiting + exponential lockout ───────────────────────────

  /**
   * Returns ms remaining in lockout (>0 = still locked), or 0 if allowed.
   * Callers should throw TooManyRequests when this returns > 0.
   */
  loginLockoutRemaining(email: string): number {
    const r = this.loginAttempts.get(email);
    if (!r) return 0;
    const now = Date.now();
    if (r.lockedUntil > now) return r.lockedUntil - now;
    // Window expired and not locked — clean up
    if (now - r.windowStart > LOGIN_RATE_WINDOW_MS && r.lockedUntil <= now) {
      this.loginAttempts.delete(email);
      return 0;
    }
    return 0;
  }

  /** @deprecated use loginLockoutRemaining() instead */
  isLoginRateLimited(email: string): boolean {
    return this.loginLockoutRemaining(email) > 0;
  }

  recordFailedLogin(email: string): { locked: boolean; lockoutMs: number } {
    const now = Date.now();
    let r = this.loginAttempts.get(email);

    if (!r || now - r.windowStart > LOGIN_RATE_WINDOW_MS) {
      r = { count: 1, windowStart: now, lockedUntil: 0 };
      this.loginAttempts.set(email, r);
      return { locked: false, lockoutMs: 0 };
    }

    r.count += 1;

    if (r.count >= LOGIN_RATE_LIMIT) {
      // Determine lockout tier based on how many times limit was hit
      const tier = Math.floor((r.count - LOGIN_RATE_LIMIT) / LOGIN_RATE_LIMIT);
      const duration = LOCKOUT_DURATIONS_MS[Math.min(tier, LOCKOUT_DURATIONS_MS.length - 1)];
      r.lockedUntil = now + duration;
      this.logger.warn(`[AUTH] Account temporarily locked: ${email} (${duration / 60000} min)`);
      return { locked: true, lockoutMs: duration };
    }

    return { locked: false, lockoutMs: 0 };
  }

  resetLoginAttempts(email: string): void {
    this.loginAttempts.delete(email);
  }
}
