import { Injectable, Logger, Inject } from '@nestjs/common';
import { randomInt } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import type Redis from 'ioredis';

const OTP_TTL_SEC = 5 * 60;                 // 5 minutes
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 30;             // 30 s
const LOGIN_RATE_LIMIT = 5;                 // failed attempts before first lockout
const LOGIN_RATE_WINDOW_SEC = 15 * 60;     // 15-minute sliding window

// Exponential lockout durations (seconds) — per-tier escalation
const LOCKOUT_DURATIONS_SEC = [
  1  * 60,   // 1st lockout: 1 min
  5  * 60,   // 2nd: 5 min
  15 * 60,   // 3rd: 15 min
  60 * 60,   // 4th+: 1 hour
];

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ─── OTP (Redis-backed) ──────────────────────────────────────────────────

  /** Generate, store, and email a 6-digit OTP. */
  async issueOtp(email: string): Promise<{ code: string; expiresAt: number; cooldownUntil: number }> {
    const now = Date.now();
    const cooldownKey = `otp:cooldown:${email}`;
    const otpKey = `otp:code:${email}`;

    const cooldownTtl = await this.redis.ttl(cooldownKey);
    if (cooldownTtl > 0) {
      // Still in cooldown — return existing OTP
      const raw = await this.redis.get(otpKey);
      const existing = raw ? JSON.parse(raw) : null;
      return {
        code: existing?.code ?? '',
        expiresAt: existing?.expiresAt ?? now + OTP_TTL_SEC * 1000,
        cooldownUntil: now + cooldownTtl * 1000,
      };
    }

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = now + OTP_TTL_SEC * 1000;

    await this.redis.set(otpKey, JSON.stringify({ code, expiresAt, attempts: 0 }), 'EX', OTP_TTL_SEC);
    await this.redis.set(cooldownKey, '1', 'EX', RESEND_COOLDOWN_SEC);

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[OTP-DEV] ${email} → ${code} (ttl=${OTP_TTL_SEC}s)`);
    } else {
      this.logger.log(`[OTP] Issued for ${email} (ttl=${OTP_TTL_SEC}s)`);
    }

    await this.mail.sendOtp(email, code, OTP_TTL_SEC);

    return { code, expiresAt, cooldownUntil: now + RESEND_COOLDOWN_SEC * 1000 };
  }

  async verifyOtp(email: string, code: string): Promise<{ ok: boolean; reason?: 'missing' | 'expired' | 'mismatch' | 'too-many-attempts' }> {
    const otpKey = `otp:code:${email}`;
    const raw = await this.redis.get(otpKey);
    if (!raw) return { ok: false, reason: 'missing' };

    const record: { code: string; expiresAt: number; attempts: number } = JSON.parse(raw);

    if (Date.now() > record.expiresAt) {
      await this.redis.del(otpKey);
      return { ok: false, reason: 'expired' };
    }

    record.attempts += 1;
    if (record.attempts > OTP_MAX_ATTEMPTS) {
      await this.redis.del(otpKey);
      return { ok: false, reason: 'too-many-attempts' };
    }

    if (record.code !== code) {
      // Persist updated attempt count
      const ttl = await this.redis.ttl(otpKey);
      await this.redis.set(otpKey, JSON.stringify(record), 'EX', Math.max(ttl, 1));
      return { ok: false, reason: 'mismatch' };
    }

    await this.redis.del(otpKey);
    return { ok: true };
  }

  async resendCooldownRemaining(email: string): Promise<number> {
    const ttl = await this.redis.ttl(`otp:cooldown:${email}`);
    return ttl > 0 ? ttl * 1000 : 0;
  }

  // ─── Login rate limiting + exponential lockout (DB-backed) ───────────────

  /**
   * Returns ms remaining in lockout, or 0 if the account is not locked.
   * Reads `User.lockedUntil` from the DB so the lockout survives restarts.
   */
  async loginLockoutRemaining(email: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { lockedUntil: true },
    });
    if (!user?.lockedUntil) return 0;
    const remaining = user.lockedUntil.getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Record a failed login attempt (Redis counter) and escalate to a DB lockout
   * when the threshold is exceeded within the window.
   */
  async recordFailedLogin(email: string): Promise<{ locked: boolean; lockoutMs: number }> {
    const counterKey = `login:attempts:${email}`;
    const tierKey = `login:tier:${email}`;

    const count = await this.redis.incr(counterKey);
    if (count === 1) {
      await this.redis.expire(counterKey, LOGIN_RATE_WINDOW_SEC);
    }

    if (count >= LOGIN_RATE_LIMIT) {
      // Determine escalation tier — persisted in Redis across the window
      const tierRaw = await this.redis.get(tierKey);
      const tier = tierRaw ? parseInt(tierRaw, 10) : 0;
      const duration = LOCKOUT_DURATIONS_SEC[Math.min(tier, LOCKOUT_DURATIONS_SEC.length - 1)];

      await this.redis.set(tierKey, String(tier + 1), 'EX', 24 * 60 * 60); // remember tier for 24h
      await this.redis.del(counterKey);

      const lockedUntil = new Date(Date.now() + duration * 1000);
      await this.prisma.user.updateMany({
        where: { email },
        data: { lockedUntil },
      });

      this.logger.warn(`[AUTH] Account locked: ${email} (${duration / 60} min, tier ${tier + 1})`);
      return { locked: true, lockoutMs: duration * 1000 };
    }

    return { locked: false, lockoutMs: 0 };
  }

  async resetLoginAttempts(email: string): Promise<void> {
    await this.redis.del(`login:attempts:${email}`);
    await this.prisma.user.updateMany({
      where: { email },
      data: { lockedUntil: null },
    });
  }
}
