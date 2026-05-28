import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../common/jwt-payload.interface';
import { OtpService } from './otp.service';
import { MailService } from '../mail/mail.service';
import { CartService } from '../cart/cart.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from '../common/date.util';

/**
 * Session lifetimes — tuned for mobile-app UX where users expect to log in
 * once and never see the login screen again unless they explicitly sign out.
 * Matches Instagram / Trendyol / Spotify pattern (~3 months refresh + 1 year
 * trusted device).
 *
 * Both desktop and mobile share the same DB column, so they get the same
 * lifetime — desktop benefits too (cookie set to expire matching DB lifetime).
 */
const REFRESH_TOKEN_LIFETIME_DAYS = 90;
const TRUSTED_DEVICE_LIFETIME_DAYS = 365;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly otp: OtpService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly cart: CartService,
  ) {}

  async register(dto: RegisterDto) {
    // Honeypot — if a bot filled the hidden `website` field, reject and audit.
    // Return the same generic error a duplicate email would so we don't reveal
    // the trap to the bot author.
    if (dto.website && dto.website.trim().length > 0) {
      this.audit.log({
        actorId: null,
        action: 'HONEYPOT_HIT',
        targetType: 'Register',
        targetId: null,
        metadata: { emailAttempted: dto.email, honeypotValue: dto.website.slice(0, 100) },
      }).catch(() => {});
      throw new ConflictException('Email already registered');
    }

    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const now = new Date();
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: 'CUSTOMER',
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        kvkkAcceptedAt: now,
        marketingConsent: dto.marketingConsent ?? false,
        marketingConsentAt: dto.marketingConsent ? now : null,
      },
      select: { id: true, email: true, role: true, tenantId: true },
    });

    return user;
  }

  async login(dto: LoginDto) {
    const lockoutMs = await this.otp.loginLockoutRemaining(dto.email);
    if (lockoutMs > 0) {
      throw new HttpException(
        `Too many failed attempts. Try again in ${Math.ceil(lockoutMs / 60000)} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      await this.otp.recordFailedLogin(dto.email);
      // Log security event — unknown email attempt (actorId null because no real user)
      this.audit.log({
        actorId: null,
        action: 'LOGIN_FAILED',
        targetType: 'User',
        targetId: null,
        metadata: { reason: 'user_not_found', emailAttempted: dto.email },
      }).catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      const { locked, lockoutMs: newLockout } = await this.otp.recordFailedLogin(dto.email);
      if (locked) {
        // Fire-and-forget security alert email
        this.mail.sendSecurityAlert(user.email, Math.ceil(newLockout / 60000)).catch(() => {});
        // Log account lockout event
        this.audit.log({
          actorId: user.id,
          action: 'ACCOUNT_LOCKED',
          targetType: 'User',
          targetId: user.id,
          metadata: { email: user.email, lockoutMinutes: Math.ceil(newLockout / 60000) },
        }).catch(() => {});
      }
      // Log failed login attempt
      this.audit.log({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        targetType: 'User',
        targetId: user.id,
        metadata: { reason: 'wrong_password', email: user.email, locked },
      }).catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.otp.resetLoginAttempts(dto.email);
    // Log successful login
    this.audit.log({
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: user.email },
    }).catch(() => {});
    return this.issueTokens(user);
  }

  /**
   * Begin a step-up login that requires an emailed OTP.
   * Verifies the password; if a valid trusted-device token is provided, skips OTP
   * and returns full auth tokens immediately. Otherwise issues an OTP challenge.
   */
  async loginWithMfa(dto: LoginDto): Promise<
    | { trusted: true; accessToken: string; refreshToken: string; user: any }
    | { trusted: false; challenge: string; email: string; cooldownUntil: number }
  > {
    const lockoutMsMfa = await this.otp.loginLockoutRemaining(dto.email);
    if (lockoutMsMfa > 0) {
      throw new HttpException(
        `Too many failed attempts. Try again in ${Math.ceil(lockoutMsMfa / 60000)} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      await this.otp.recordFailedLogin(dto.email);
      this.audit.log({
        actorId: null,
        action: 'LOGIN_FAILED',
        targetType: 'User',
        targetId: null,
        metadata: { reason: 'user_not_found', emailAttempted: dto.email, mfa: true },
      }).catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      const { locked, lockoutMs: newLockout } = await this.otp.recordFailedLogin(dto.email);
      if (locked) {
        this.mail.sendSecurityAlert(user.email, Math.ceil(newLockout / 60000)).catch(() => {});
        this.audit.log({
          actorId: user.id,
          action: 'ACCOUNT_LOCKED',
          targetType: 'User',
          targetId: user.id,
          metadata: { email: user.email, lockoutMinutes: Math.ceil(newLockout / 60000), mfa: true },
        }).catch(() => {});
      }
      this.audit.log({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        targetType: 'User',
        targetId: user.id,
        metadata: { reason: 'wrong_password', email: user.email, locked, mfa: true },
      }).catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.otp.resetLoginAttempts(dto.email);

    // Check if device is trusted — skip OTP if so
    if (dto.deviceToken) {
      const device = await this.prisma.trustedDevice.findUnique({ where: { token: dto.deviceToken } });
      if (device && device.userId === user.id && device.expiresAt > new Date()) {
        const tokens = await this.issueTokens(user);
        return { trusted: true, ...tokens };
      }
      // Expired / invalid device token — clean up silently and fall through to OTP
      if (device) {
        await this.prisma.trustedDevice.delete({ where: { token: dto.deviceToken } }).catch(() => {});
      }
    }

    const { cooldownUntil } = await this.otp.issueOtp(dto.email);
    // The challenge token is a short-lived JWT proving the password was valid;
    // it is required when verifying the OTP, so an attacker can't simply
    // call /verify-otp for any email.
    const challenge = this.jwtService.sign(
      { sub: user.id, email: user.email, purpose: 'mfa' },
      { expiresIn: '10m', secret: this.config.get('JWT_ACCESS_SECRET') },
    );
    return { trusted: false, challenge, email: user.email, cooldownUntil };
  }

  async verifyLoginOtp(challenge: string, code: string, trustDevice?: boolean) {
    let payload: any;
    try {
      payload = this.jwtService.verify(challenge, { secret: this.config.get('JWT_ACCESS_SECRET') });
    } catch {
      throw new UnauthorizedException('Challenge expired or invalid');
    }
    if (payload?.purpose !== 'mfa') throw new UnauthorizedException('Invalid challenge');

    const result = await this.otp.verifyOtp(payload.email, code);
    if (!result.ok) {
      if (result.reason === 'expired') throw new BadRequestException('Code expired');
      if (result.reason === 'too-many-attempts') throw new HttpException('Too many attempts', HttpStatus.TOO_MANY_REQUESTS);
      throw new UnauthorizedException('Invalid code');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, tenantId: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const tokens = await this.issueTokens(user);

    // Issue a long-lived device token so next login from this device skips OTP.
    // 1 year is the right balance — long enough that users never see the OTP
    // step again on their primary device, short enough that a stolen device
    // re-auths within a reasonable window.
    let deviceToken: string | undefined;
    if (trustDevice) {
      deviceToken = uuidv4();
      const expiresAt = addDays(new Date(), TRUSTED_DEVICE_LIFETIME_DAYS);
      await this.prisma.trustedDevice.create({
        data: { token: deviceToken, userId: user.id, expiresAt },
      });
    }

    this.audit.log({
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: user.email, mfa: true, trustedDevice: !!trustDevice },
    }).catch(() => {});

    return { ...tokens, deviceToken };
  }

  async resendLoginOtp(challenge: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(challenge, { secret: this.config.get('JWT_ACCESS_SECRET') });
    } catch {
      throw new UnauthorizedException('Challenge expired or invalid');
    }
    if (payload?.purpose !== 'mfa') throw new UnauthorizedException('Invalid challenge');

    const remaining = await this.otp.resendCooldownRemaining(payload.email);
    if (remaining > 0) {
      throw new HttpException(
        `Please wait ${Math.ceil(remaining / 1000)}s before requesting another code`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const { cooldownUntil } = await this.otp.issueOtp(payload.email);
    return { cooldownUntil };
  }

  async refreshTokens(userId: string, oldToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: oldToken } });
    if (!stored || stored.userId !== userId || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, tenantId: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    await this.prisma.refreshToken.delete({ where: { token: oldToken } });
    return this.issueTokens(user);
  }

  // Mobile-only: accept refresh token from request body instead of httpOnly cookie
  async refreshTokensByValue(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, email: true, role: true, tenantId: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    await this.prisma.refreshToken.delete({ where: { token } });
    return this.issueTokens(user);
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, token: refreshToken },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, phone: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true
      }
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: any) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name, phone: dto.phone },
      select: {
        id: true, email: true, name: true, phone: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true
      }
    });
    return user;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://vibehub.vercel.app';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
    await this.mail.sendPasswordReset(user.email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, lockedUntil: null } as any,
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
      // Kill all active sessions
      this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
      // Revoke ALL trusted devices — critical for account-takeover recovery.
      // Otherwise attacker who triggered password-reset keeps their MFA bypass.
      this.prisma.trustedDevice.deleteMany({ where: { userId: record.userId } }),
    ]);

    await this.audit.log({
      actorId: record.userId,
      action: 'PASSWORD_RESET',
      targetType: 'User',
      targetId: record.userId,
      metadata: { reason: 'forgot_password_flow' },
    });
  }

  async changePassword(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Invalid current password');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      // Invalidate all sessions
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      // Revoke trusted devices — user just changed password, likely because they
      // suspect a device was compromised. Old "trusted" devices should re-verify.
      this.prisma.trustedDevice.deleteMany({ where: { userId } }),
    ]);

    await this.audit.log({
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      targetType: 'User',
      targetId: userId,
    });

    return { success: true };
  }

  /**
   * KVKK Art. 11 / GDPR Art. 17 — Right to erasure.
   *
   * We cannot fully `DELETE FROM "User"` because several FK relationships
   * intentionally keep records around for accounting/tax/compliance:
   *   - Order.customerId        — REQUIRED to keep for 10 years (Turkish tax law)
   *   - OrderItem               — accounting trail follows Order
   *   - Review.customerId       — content survives, attribution anonymised
   *   - ForumTopic / ForumReply — anonymised, kept so threads don't break
   *   - AuditLog.actorId        — REQUIRED for forensics, anonymised only
   *
   * The strategy:
   *   1. Refuse if customer has active orders (vendor still needs to ship).
   *   2. Purge everything tied 1:1 to identity (profile, devices, push, DMs,
   *      cart, wishlist, follows, profile-visits, notifications, page-views).
   *      Most of these cascade automatically via `onDelete: Cascade` once we
   *      anonymise User in step 4, but we run explicit deletes first to be
   *      defensive against schema drift.
   *   3. Anonymise foreign-key references that must survive (Order, Review,
   *      Forum*, AuditLog, NFC tag ownership).
   *   4. Wipe PII from User itself (email/name/phone/avatar/passwordHash) and
   *      set `accountDeletedAt` instead of hard-deleting.
   *
   * Why anonymise instead of full delete? Turkish KVKK explicitly permits
   * keeping anonymised data where there is a legal obligation to retain
   * (Maliye Bakanlığı: 10-year invoice retention). Anonymisation is the
   * KVKK-defensible alternative when full deletion would break a legal duty.
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new BadRequestException('Invalid password');

    // 1. Refuse if there's an in-flight order — vendor still owes fulfillment.
    // Allowed terminal statuses: DELIVERED, CANCELLED, REFUNDED.
    // Blocked: PLACED, CONFIRMED, SHIPPED, REFUND_REQUESTED.
    const activeOrderCount = await this.prisma.order.count({
      where: {
        customerId: userId,
        status: { in: ['PLACED', 'CONFIRMED', 'SHIPPED', 'REFUND_REQUESTED'] },
      },
    });
    if (activeOrderCount > 0) {
      throw new BadRequestException(
        `Hesabını silmeden önce ${activeOrderCount} adet açık siparişinin tamamlanması gerekiyor (teslim, iptal veya iade). Lütfen sipariş durumlarını sayfanda kontrol et.`,
      );
    }

    // 2 + 3 + 4: do all of it in one transaction so a mid-flight crash never
    // leaves the user half-anonymised. The transaction runs the long sequence
    // of explicit deletes (defensive, even though many cascade) and then the
    // PII wipe on User itself.
    const anonEmail = `deleted-${userId}@anonymised.vibehub.local`;
    await this.prisma.$transaction([
      // ─── Hard purge — user-tied identity & behavioural data ────────────────
      this.prisma.userProfile.deleteMany({ where: { userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.trustedDevice.deleteMany({ where: { userId } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
      this.prisma.wishlist.deleteMany({ where: { userId } }),
      this.prisma.follow.deleteMany({ where: { userId } }),
      this.prisma.pushDevice.deleteMany({ where: { userId } }),
      this.prisma.appNotification.deleteMany({ where: { userId } }),
      this.prisma.pageView.deleteMany({ where: { userId } }),
      this.prisma.forumReaction.deleteMany({ where: { userId } }),
      // ProfileVisit — purge both directions (as visitor and as target)
      this.prisma.profileVisit.deleteMany({
        where: { OR: [{ visitorId: userId }, { profileUserId: userId }] },
      }),
      // DirectMessage — purge entire correspondence on both sides
      this.prisma.directMessage.deleteMany({
        where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      }),

      // ─── Anonymise — references that must survive ──────────────────────────
      // Order: keep the order + line items for accounting, drop PII from shipping address.
      // We can't NULL customerId (FK is NOT NULL in schema), so we keep it but
      // strip the snapshot address JSON. customer.email is cleared in step 4.
      this.prisma.order.updateMany({
        where: { customerId: userId },
        // We deliberately do NOT null customerId — schema requires it, and the
        // anonymised User row still satisfies the FK while leaking no PII.
        data: { shippingAddress: { anonymisedAt: new Date().toISOString() } },
      }),
      // Review: keep the rating + comment (other shoppers benefit), strip nothing
      // (customer.name is cleared in step 4, so the avatar/handle vanishes).
      // No update needed here.

      // ForumTopic / ForumReply / NfcTag: authorId stays for thread integrity
      // and tag ownership history; anonymising the User row in step 4 is what
      // hides the identity.

      // AuditLog: KEEP for forensics — anonymise actorId only.
      // Required by KVKK + Turkish security standards (TS ISO/IEC 27001).
      this.prisma.auditLog.updateMany({
        where: { actorId: userId },
        data: { actorId: null },
      }),

      // ─── PII wipe on User itself ───────────────────────────────────────────
      // We keep the row so non-nullable FKs (Order.customerId, Review.customerId,
      // ForumTopic.authorId, etc.) remain valid. Every PII field is cleared.
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: anonEmail,
          name: null,
          phone: null,
          avatarUrl: null,
          // Random password the user can never re-discover — prevents accidental
          // resurrection if email column ever gets edited.
          passwordHash: '$2b$12$' + uuidv4().replace(/-/g, '') + uuidv4().slice(0, 22),
          tenantId: null,
          marketingConsent: false,
          marketingConsentAt: null,
          accountDeletedAt: new Date(),
          lockedUntil: null,
        },
      }),
    ]);

    // Server-side cart lives in Redis, outside the transaction.
    // Best-effort: a failure here is acceptable since cart TTLs in 7 days anyway.
    try {
      await this.cart.clearCart(userId);
    } catch (err: any) {
      this.logger.warn(`[deleteAccount] cart clear failed for ${userId}: ${err?.message}`);
    }

    // Audit-log the deletion itself with the actorId still attached (the
    // anonymised actorId update above runs in the same transaction, so this
    // audit row is the LAST one to show the real user did it — exactly what
    // forensics needs).
    this.audit.log({
      actorId: userId,
      action: 'ACCOUNT_DELETED',
      targetType: 'User',
      targetId: userId,
      metadata: { method: 'self_service_kvkk' },
    }).catch(() => {});
  }

  async listTrustedDevices(userId: string) {
    const now = new Date();
    return this.prisma.trustedDevice.findMany({
      where: { userId, expiresAt: { gt: now } },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeTrustedDevice(userId: string, deviceId: string) {
    const device = await this.prisma.trustedDevice.findUnique({ where: { id: deviceId } });
    if (!device || device.userId !== userId) {
      throw new BadRequestException('Device not found');
    }
    await this.prisma.trustedDevice.delete({ where: { id: deviceId } });
    return { revoked: true };
  }

  async revokeAllTrustedDevices(userId: string) {
    const { count } = await this.prisma.trustedDevice.deleteMany({ where: { userId } });
    return { revoked: count };
  }

  async updateMarketingConsent(userId: string, consent: boolean) {
    const now = new Date();
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        marketingConsent: consent,
        marketingConsentAt: now,
      },
      select: { id: true, marketingConsent: true, marketingConsentAt: true },
    });
    return user;
  }

  private async issueTokens(user: { id: string; email: string; role: any; tenantId: string | null }) {
    // PII minimisation: access token must NOT include email.
    // If the client needs the user's email, fetch it from /me endpoint using the sub claim.
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshTokenValue = uuidv4();
    const expiresAt = addDays(new Date(), REFRESH_TOKEN_LIFETIME_DAYS);
    await this.prisma.refreshToken.create({
      data: { token: refreshTokenValue, userId: user.id, expiresAt },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      // Return minimal user data — email is not needed post-login and reduces PII exposure
      user: { id: user.id, role: user.role, tenantId: user.tenantId },
    };
  }
}
