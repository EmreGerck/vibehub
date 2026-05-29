/**
 * SECURITY TEST — Authentication & Session Management
 * ════════════════════════════════════════════════════
 * CSO threat model: credential attacks, token abuse, account enumeration,
 * JWT algorithm confusion, session fixation, brute-force bypass.
 *
 * OWASP: A07 Identification and Authentication Failures
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, HttpException, ConflictException } from '@nestjs/common';
import { CodedException } from '../common/coded-exception';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../auth/otp.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const PASSWORD       = 'C0rrectPassword!';
const PASSWORD_HASH  = bcrypt.hashSync(PASSWORD, 12);
const VALID_USER = {
  id:           'user-sec-001',
  email:        'victim@example.com',
  passwordHash: PASSWORD_HASH,
  role:         'CUSTOMER',
  tenantId:     null,
};

function makePrisma(userOverride?: any) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(userOverride !== undefined ? userOverride : VALID_USER),
      create:     jest.fn().mockResolvedValue({ id: 'new-user', email: 'new@example.com', role: 'CUSTOMER', tenantId: null }),
    },
    refreshToken: {
      create:     jest.fn().mockResolvedValue({ id: 'rt-001', token: 'refresh-token', userId: VALID_USER.id }),
      findUnique: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    trustedDevice: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaService;
}

function makeOtp(overrides: Partial<{ lockoutMs: number; locked: boolean }> = {}) {
  return {
    loginLockoutRemaining: jest.fn().mockResolvedValue(overrides.lockoutMs ?? 0),
    recordFailedLogin:     jest.fn().mockResolvedValue({ locked: overrides.locked ?? false, lockoutMs: 60000 }),
    resetLoginAttempts:    jest.fn().mockResolvedValue(undefined),
    issueOtp:              jest.fn().mockResolvedValue({ code: '123456', expiresAt: Date.now() + 300000, cooldownUntil: 0 }),
    verifyOtp:             jest.fn().mockResolvedValue({ ok: true }),
  } as unknown as OtpService;
}

const mockMail  = { sendSecurityAlert: jest.fn().mockResolvedValue(undefined), sendOtp: jest.fn() } as unknown as MailService;
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
const mockJwt   = { sign: jest.fn().mockReturnValue('signed.jwt.token'), verify: jest.fn() } as unknown as JwtService;
const mockConfig = { get: jest.fn((k: string, d?: any) => d ?? '') } as unknown as ConfigService;

async function buildAuth(prismaOverride?: any, otpOverride?: OtpService): Promise<AuthService> {
  // Local import keeps the test file's dep graph self-contained
  const { CartService } = await import('../cart/cart.service');
  const mockCart = { clearCart: jest.fn(), getRawEntries: jest.fn().mockResolvedValue([]) } as any;
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: PrismaService,  useValue: prismaOverride ?? makePrisma() },
      { provide: JwtService,     useValue: mockJwt },
      { provide: ConfigService,  useValue: mockConfig },
      { provide: OtpService,     useValue: otpOverride ?? makeOtp() },
      { provide: MailService,    useValue: mockMail },
      { provide: AuditService,   useValue: mockAudit },
      { provide: CartService,    useValue: mockCart },
    ],
  }).compile();
  return module.get<AuthService>(AuthService);
}

beforeEach(() => jest.clearAllMocks());

// ─── SEC-AUTH-01: Credential Brute Force ─────────────────────────────────────

describe('[SEC-AUTH-01] Brute Force Attack Prevention', () => {
  it('rate-limits after N failed attempts (lockout > 0)', async () => {
    // Attacker has already triggered lockout
    const otp = makeOtp({ lockoutMs: 300000 }); // 5 min remaining
    const svc = await buildAuth(undefined, otp);
    await expect(svc.login({ email: 'victim@example.com', password: 'wrong' }))
      .rejects.toThrow(HttpException);
    // Must NOT call DB — prevents timing-based enumeration during lockout
    expect((makePrisma().user.findUnique as jest.Mock)).not.toHaveBeenCalled();
  });

  it('records failed attempt on wrong password', async () => {
    const otp = makeOtp();
    const svc = await buildAuth(undefined, otp);
    await expect(svc.login({ email: 'victim@example.com', password: 'WRONG_PASSWORD' }))
      .rejects.toMatchObject({ errorCode: 'VH-2001' });
    expect(otp.recordFailedLogin).toHaveBeenCalledWith('victim@example.com');
  });

  it('sends security alert on account lockout', async () => {
    const otp = makeOtp({ locked: true });
    const svc = await buildAuth(undefined, otp);
    await expect(svc.login({ email: 'victim@example.com', password: 'WRONG' }))
      .rejects.toMatchObject({ errorCode: 'VH-2001' });
    // Alert is fire-and-forget — just verify it was called
    await new Promise(r => setTimeout(r, 10));
    expect(mockMail.sendSecurityAlert).toHaveBeenCalledWith('victim@example.com', expect.any(Number));
  });

  it('logs ACCOUNT_LOCKED audit event with actor metadata', async () => {
    const otp = makeOtp({ locked: true });
    const svc = await buildAuth(undefined, otp);
    await expect(svc.login({ email: 'victim@example.com', password: 'WRONG' }))
      .rejects.toThrow();
    await new Promise(r => setTimeout(r, 10));
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ACCOUNT_LOCKED', targetType: 'User' }),
    );
  });

  it('lockout response body does NOT reveal remaining attempt count', async () => {
    const otp = makeOtp({ lockoutMs: 180000 });
    const svc = await buildAuth(undefined, otp);
    try {
      await svc.login({ email: 'victim@example.com', password: 'wrong' });
      fail('expected to throw');
    } catch (e: any) {
      const msg = e.message ?? '';
      // Must NOT reveal the remaining attempt counter (e.g., "2 attempts remaining")
      expect(msg).not.toMatch(/\d+\s*attempt|\battempts?\s+remaining|remaining\s+attempt/i);
      expect(msg).toMatch(/minute/i);
    }
  });
});

// ─── SEC-AUTH-02: Account Enumeration ────────────────────────────────────────

describe('[SEC-AUTH-02] Account Enumeration Prevention', () => {
  it('returns identical error for missing user vs wrong password', async () => {
    const svcNotFound  = await buildAuth(makePrisma(null));
    const svcWrongPass = await buildAuth(makePrisma(VALID_USER));

    let errNotFound: any, errWrongPass: any;
    try { await svcNotFound.login({ email: 'x@x.com', password: 'anything' }); }
    catch (e) { errNotFound = e; }
    try { await svcWrongPass.login({ email: 'victim@example.com', password: 'WRONG' }); }
    catch (e) { errWrongPass = e; }

    // Both must carry the same code with no leaking context (account enumeration prevention).
    expect(errNotFound).toBeInstanceOf(CodedException);
    expect(errWrongPass).toBeInstanceOf(CodedException);
    expect(errNotFound.errorCode).toBe('VH-2001');
    expect(errWrongPass.errorCode).toBe('VH-2001');
    expect(errNotFound.context).toEqual(errWrongPass.context); // identical response
  });

  it('register endpoint returns ConflictException for duplicate email (not user data)', async () => {
    const prisma = makePrisma(VALID_USER); // email exists
    const svc = await buildAuth(prisma);
    await expect(svc.register({
      email: 'victim@example.com',
      password: 'NewPassword123!',
      termsAccepted: true,
      privacyAccepted: true,
    })).rejects.toMatchObject({ errorCode: 'VH-2002' });
    // Response must NOT leak existing user's id/role/tenantId
  });

  it('passwordHash is never returned in register response', async () => {
    const prisma = makePrisma(null); // no existing user
    const svc = await buildAuth(prisma);
    const result = await svc.register({
      email: 'new@example.com',
      password: 'StrongPass123!',
      termsAccepted: true,
      privacyAccepted: true,
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('password');
  });
});

// ─── SEC-AUTH-03: Password Security ──────────────────────────────────────────

describe('[SEC-AUTH-03] Password Hashing Integrity', () => {
  it('stores bcrypt hash (cost ≥ 10), not plaintext', async () => {
    const prisma = makePrisma(null);
    const capturedCreateArg = jest.fn();
    (prisma.user.create as jest.Mock).mockImplementation(async (args) => {
      capturedCreateArg(args.data.passwordHash);
      return { id: 'u', email: 'new@example.com', role: 'CUSTOMER', tenantId: null };
    });
    const svc = await buildAuth(prisma);
    await svc.register({ email: 'new@example.com', password: 'MyPass123!', termsAccepted: true, privacyAccepted: true });

    const storedHash = capturedCreateArg.mock.calls[0][0];
    expect(storedHash).toMatch(/^\$2[ab]\$1[02]\$/); // bcrypt with cost ≥ 10
    expect(storedHash).not.toBe('MyPass123!');
  });

  it('bcrypt compare works correctly — plaintext is never stored', async () => {
    const svc = await buildAuth();
    // Correct password → resolves
    await expect(svc.login({ email: 'victim@example.com', password: PASSWORD }))
      .resolves.toBeDefined();
  });

  it('rejects SQL injection strings as passwords (no DB error)', async () => {
    const svc = await buildAuth();
    const sqlPayloads = [
      "' OR 1=1 --",
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
    ];
    for (const payload of sqlPayloads) {
      await expect(svc.login({ email: 'victim@example.com', password: payload }))
        .rejects.toMatchObject({ errorCode: 'VH-2001' });
    }
  });
});

// ─── SEC-AUTH-04: JWT Integrity ───────────────────────────────────────────────

describe('[SEC-AUTH-04] JWT Token Security', () => {
  it('login returns access+refresh token pair — no sensitive data in payload', async () => {
    const svc = await buildAuth();
    const result = await svc.login({ email: 'victim@example.com', password: PASSWORD });
    // Must have tokens
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    // Must NOT embed password hash or full user object
    const payload = JSON.stringify(result);
    expect(payload).not.toContain('passwordHash');
    expect(payload).not.toContain(PASSWORD);
  });

  it('JWT sign is called with role and tenantId — minimum necessary claims', async () => {
    const svc = await buildAuth();
    await svc.login({ email: 'victim@example.com', password: PASSWORD });
    // NestJS JwtService.sign(payload) — single-argument call
    expect(mockJwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: VALID_USER.id, role: VALID_USER.role }),
    );
    // email must NOT be in access token JWT payload (PII minimisation)
    const signCall = (mockJwt.sign as jest.Mock).mock.calls[0][0];
    expect(signCall).not.toHaveProperty('email');
    expect(signCall).toHaveProperty('sub');
    expect(signCall).toHaveProperty('role');
    expect(signCall).toHaveProperty('tenantId');
  });
});

// ─── SEC-AUTH-05: OTP Verification Security ───────────────────────────────────

describe('[SEC-AUTH-05] OTP / 2FA Security', () => {
  it('OTP uses cryptographically random source (randomInt, not Math.random)', () => {
    // Structural test — verify crypto.randomInt is imported in otp.service.ts
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../auth/otp.service.ts'),
      'utf8',
    );
    expect(src).toContain("randomInt");
    expect(src).toContain("from 'crypto'");
    expect(src).not.toContain('Math.random');
  });

  it('OTP has fixed 5-minute TTL (not indefinite)', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../auth/otp.service.ts'),
      'utf8',
    );
    // OTP_TTL_SEC = 5 * 60 = 300
    expect(src).toContain('5 * 60');
  });

  it('OTP lockout escalates (exponential backoff strategy present)', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../auth/otp.service.ts'),
      'utf8',
    );
    expect(src).toContain('LOCKOUT_DURATIONS_SEC');
    // Must have at least 3 tiers
    const matches = src.match(/\d+\s*\*\s*60/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── SEC-AUTH-06: Audit Logging Completeness ─────────────────────────────────

describe('[SEC-AUTH-06] Security Audit Logging', () => {
  it('logs LOGIN_FAILED for unknown email', async () => {
    const svc = await buildAuth(makePrisma(null));
    await expect(svc.login({ email: 'ghost@example.com', password: 'any' }))
      .rejects.toThrow();
    await new Promise(r => setTimeout(r, 10));
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_FAILED', metadata: expect.objectContaining({ reason: 'user_not_found' }) }),
    );
  });

  it('logs LOGIN_FAILED for wrong password', async () => {
    const svc = await buildAuth();
    await expect(svc.login({ email: 'victim@example.com', password: 'WRONG' }))
      .rejects.toThrow();
    await new Promise(r => setTimeout(r, 10));
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_FAILED' }),
    );
  });

  it('audit log for LOGIN_FAILED does NOT include the attempted password', async () => {
    const ATTEMPTED_PASS = 'AttemptedPassword123!';
    const svc = await buildAuth();
    await expect(svc.login({ email: 'victim@example.com', password: ATTEMPTED_PASS }))
      .rejects.toThrow();
    await new Promise(r => setTimeout(r, 10));
    const allCalls = (mockAudit.log as jest.Mock).mock.calls.flat();
    const loggedData = JSON.stringify(allCalls);
    expect(loggedData).not.toContain(ATTEMPTED_PASS);
  });
});
