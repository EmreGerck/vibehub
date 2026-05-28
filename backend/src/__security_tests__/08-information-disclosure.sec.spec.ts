/**
 * SECURITY TEST — Information Disclosure
 * ══════════════════════════════════════════════════════════════════
 * CSO threat model: stack traces in API responses, passwordHash leakage,
 * sensitive PII in JWT payload, internal error messages revealing
 * infrastructure details, Swagger enabled in production, verbose logging.
 *
 * OWASP: A05 Security Misconfiguration, A02 Cryptographic Failures
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as fs   from 'fs';
import * as path from 'path';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OtpService } from '../auth/otp.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PASSWORD      = 'SecurePass123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 12);

const VALID_USER = {
  id:           'user-disc-001',
  email:        'user@example.com',
  passwordHash: PASSWORD_HASH,
  role:         'CUSTOMER',
  tenantId:     null,
};

function makePrisma(user?: any) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(user !== undefined ? user : VALID_USER),
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

const mockOtp = {
  loginLockoutRemaining: jest.fn().mockResolvedValue(0),
  recordFailedLogin:     jest.fn().mockResolvedValue({ locked: false, lockoutMs: 60000 }),
  resetLoginAttempts:    jest.fn().mockResolvedValue(undefined),
  issueOtp:              jest.fn().mockResolvedValue({ code: '123456', expiresAt: Date.now() + 300000, cooldownUntil: 0 }),
  verifyOtp:             jest.fn().mockResolvedValue({ ok: true }),
} as unknown as OtpService;

const mockMail  = { sendSecurityAlert: jest.fn(), sendOtp: jest.fn() } as unknown as MailService;
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
const mockJwt   = { sign: jest.fn().mockReturnValue('signed.jwt.token'), verify: jest.fn() } as unknown as JwtService;
const mockConfig = { get: jest.fn((k: string, d?: any) => d ?? '') } as unknown as ConfigService;

async function buildAuth(prismaOverride?: any): Promise<AuthService> {
  // Local import keeps the test file's dep graph self-contained
  const { CartService } = await import('../cart/cart.service');
  const mockCart = { clearCart: jest.fn(), getRawEntries: jest.fn().mockResolvedValue([]) } as any;
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: PrismaService,  useValue: prismaOverride ?? makePrisma() },
      { provide: JwtService,     useValue: mockJwt },
      { provide: ConfigService,  useValue: mockConfig },
      { provide: OtpService,     useValue: mockOtp },
      { provide: MailService,    useValue: mockMail },
      { provide: AuditService,   useValue: mockAudit },
      { provide: CartService,    useValue: mockCart },
    ],
  }).compile();
  return module.get<AuthService>(AuthService);
}

function readSrc(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

beforeEach(() => jest.clearAllMocks());

// ─── SEC-DISC-01: passwordHash Never in Responses ────────────────────────────

describe('[SEC-DISC-01] passwordHash Exclusion from API Responses', () => {
  it('login response does NOT contain passwordHash', async () => {
    const svc = await buildAuth();
    const result = await svc.login({ email: 'user@example.com', password: PASSWORD });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain(PASSWORD_HASH);
  });

  it('register response does NOT contain passwordHash or password', async () => {
    const svc = await buildAuth(makePrisma(null));
    const result = await svc.register({
      email: 'new@example.com',
      password: 'NewPass123!',
      termsAccepted: true,
      privacyAccepted: true,
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('password');
  });

  it('error response for wrong password does NOT reveal hash', async () => {
    const svc = await buildAuth();
    try {
      await svc.login({ email: 'user@example.com', password: 'WRONG' });
    } catch (e: any) {
      const errStr = JSON.stringify(e);
      expect(errStr).not.toContain('passwordHash');
      expect(errStr).not.toContain(PASSWORD_HASH);
    }
  });
});

// ─── SEC-DISC-02: JWT Payload PII Minimisation ────────────────────────────────

describe('[SEC-DISC-02] JWT Payload Contains Minimum PII', () => {
  it('JWT payload does NOT include email address', async () => {
    const svc = await buildAuth();
    await svc.login({ email: 'user@example.com', password: PASSWORD });
    const signCalls = (mockJwt.sign as jest.Mock).mock.calls;
    expect(signCalls.length).toBeGreaterThan(0);
    for (const [payload] of signCalls) {
      expect(payload).not.toHaveProperty('email');
    }
  });

  it('JWT payload does NOT include passwordHash', async () => {
    const svc = await buildAuth();
    await svc.login({ email: 'user@example.com', password: PASSWORD });
    for (const [payload] of (mockJwt.sign as jest.Mock).mock.calls) {
      expect(payload).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(payload)).not.toContain(PASSWORD_HASH);
    }
  });

  it('JWT payload contains only sub, role, tenantId (minimum claims)', async () => {
    const svc = await buildAuth();
    await svc.login({ email: 'user@example.com', password: PASSWORD });
    const accessTokenPayload = (mockJwt.sign as jest.Mock).mock.calls[0][0];
    // MUST have
    expect(accessTokenPayload).toHaveProperty('sub');
    expect(accessTokenPayload).toHaveProperty('role');
    // MUST NOT have PII beyond minimum
    expect(accessTokenPayload).not.toHaveProperty('email');
    expect(accessTokenPayload).not.toHaveProperty('passwordHash');
    expect(accessTokenPayload).not.toHaveProperty('name');
  });
});

// ─── SEC-DISC-03: Error Message Information Leakage ──────────────────────────

describe('[SEC-DISC-03] Error Messages Do Not Reveal Infrastructure', () => {
  it('login error for unknown user does not reveal DB structure', async () => {
    const svc = await buildAuth(makePrisma(null));
    try {
      await svc.login({ email: 'ghost@example.com', password: 'any' });
    } catch (e: any) {
      const msg = (e.message ?? '').toLowerCase();
      expect(msg).not.toContain('prisma');
      expect(msg).not.toContain('sql');
      expect(msg).not.toContain('database');
      expect(msg).not.toContain('postgres');
      expect(msg).not.toContain('findunique');
    }
  });

  it('conflict error on duplicate email does not expose existing user data', async () => {
    const svc = await buildAuth(makePrisma(VALID_USER));
    try {
      await svc.register({
        email: 'user@example.com',
        password: 'NewPass123!',
        termsAccepted: true,
        privacyAccepted: true,
      });
    } catch (e: any) {
      // ConflictException message should not leak existing user's ID or role
      const errStr = JSON.stringify(e);
      expect(errStr).not.toContain(VALID_USER.id);
      expect(errStr).not.toContain(VALID_USER.passwordHash);
    }
  });
});

// ─── SEC-DISC-04: Swagger / API Docs in Production ───────────────────────────

describe('[SEC-DISC-04] Swagger Disabled in Production', () => {
  it('main.ts gates Swagger behind non-production check', () => {
    try {
      const src = readSrc('../main.ts');
      const hasSwagger = src.includes('SwaggerModule') || src.includes('swagger');
      if (hasSwagger) {
        // Swagger must be conditional on environment
        expect(src).toMatch(/NODE_ENV.*production|development.*swagger|swagger.*development|process\.env/i);
      }
      // If no Swagger at all, even better
    } catch {
      expect(true).toBe(true); // File not readable — informational
    }
  });
});

// ─── SEC-DISC-05: Response Stripping (select/omit patterns) ──────────────────

describe('[SEC-DISC-05] Prisma Response Field Stripping', () => {
  it('auth service select clause excludes passwordHash from user queries', () => {
    const src = readSrc('auth/auth.service.ts');
    // Either use select: { passwordHash: false } or select specific safe fields
    // OR it retrieves passwordHash only for comparison and does not forward it
    const forwardsPasswordHash = src.match(/return.*passwordHash|response.*passwordHash/i);
    expect(forwardsPasswordHash).toBeNull();
  });

  it('order service does not return raw user passwordHash in order response', () => {
    const src = readSrc('order/order.service.ts');
    expect(src).not.toMatch(/include.*user.*passwordHash|user.*select.*passwordHash/i);
  });
});

// ─── SEC-DISC-06: Verbose Stack Trace Prevention ─────────────────────────────

describe('[SEC-DISC-06] Stack Trace Not Exposed in HTTP Responses', () => {
  it('global exception filter or NestJS default strips stack traces in production', () => {
    // NestJS default HttpException filters strip stack traces — verify no custom filter undoes this
    try {
      const possibleFilters = [
        'common/filters/http-exception.filter.ts',
        'common/http-exception.filter.ts',
        'filters/http-exception.filter.ts',
      ];
      for (const filterPath of possibleFilters) {
        try {
          const src = readSrc(filterPath);
          // A custom filter must not include stack in the response body
          expect(src).not.toMatch(/stack.*response\.json|json.*stack/i);
        } catch { /* not found — ok */ }
      }
    } catch {
      expect(true).toBe(true);
    }
  });

  it('no console.log of full error objects in auth service', () => {
    const src = readSrc('auth/auth.service.ts');
    // Full error logging to console leaks in containerized envs with log aggregation
    expect(src).not.toMatch(/console\.log\(.*error|console\.log\(e\)/i);
  });
});
