/**
 * Auth Service — Unit Tests
 * ─────────────────────────
 * Tests the three most security-critical paths:
 *   1. Happy-path login → tokens issued
 *   2. Wrong password → failure counted, account locked after threshold
 *   3. Register → duplicate email rejected
 *
 * All external dependencies (Prisma, Redis/OTP, JWT, Mail, Audit) are mocked
 * so tests run without a real database or Redis instance.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { CodedException } from '../../common/coded-exception';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { OtpService } from '../otp.service';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CartService } from '../../cart/cart.service';
import * as bcrypt from 'bcrypt';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'user-123',
  email: 'test@vibehub.io',
  name: 'Test User',
  role: 'CUSTOMER' as const,
  tenantId: null,
  passwordHash: '',          // filled in beforeAll
  lockedUntil: null,
  accountDeletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Mock factories ────────────────────────────────────────────────────────────

function makePrismaMock(userOverride?: Partial<typeof MOCK_USER> | null) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(
        userOverride === null ? null : { ...MOCK_USER, ...userOverride },
      ),
      findFirst:  jest.fn().mockResolvedValue(null),
      create:     jest.fn().mockImplementation((args: any) => Promise.resolve({
        ...MOCK_USER,
        ...args.data,
        id: 'new-user-id',
      })),
    },
    refreshToken: {
      create:     jest.fn().mockResolvedValue({ token: 'refresh-tok' }),
      deleteMany: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaService;
}

function makeOtpMock(overrides?: Partial<{
  lockoutMs: number;
  failResult: { locked: boolean; lockoutMs: number };
}>) {
  return {
    loginLockoutRemaining: jest.fn().mockResolvedValue(overrides?.lockoutMs ?? 0),
    recordFailedLogin:     jest.fn().mockResolvedValue(overrides?.failResult ?? { locked: false, lockoutMs: 0 }),
    resetLoginAttempts:    jest.fn().mockResolvedValue(undefined),
  } as unknown as OtpService;
}

function makeJwtMock() {
  return {
    sign:        jest.fn().mockReturnValue('jwt.tok.en'),
    signAsync:   jest.fn().mockResolvedValue('jwt.tok.en'),
    verifyAsync: jest.fn().mockResolvedValue({ sub: MOCK_USER.id, email: MOCK_USER.email }),
  } as unknown as JwtService;
}

function makeAuditMock() {
  return { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
}

function makeMailMock() {
  return {
    sendSecurityAlert:    jest.fn().mockResolvedValue(undefined),
    sendOtp:              jest.fn().mockResolvedValue(undefined),
    sendVendorWelcome:    jest.fn().mockResolvedValue(undefined),
  } as unknown as MailService;
}

function makeConfigMock(overrides: Record<string, string> = {}) {
  return {
    get: jest.fn().mockImplementation((key: string, def?: string) => overrides[key] ?? def ?? ''),
  } as unknown as ConfigService;
}

function makeCartMock() {
  return {
    clearCart:      jest.fn().mockResolvedValue(undefined),
    getRawEntries:  jest.fn().mockResolvedValue([]),
  } as unknown as CartService;
}

// ── Helper: build module ──────────────────────────────────────────────────────

async function buildModule(opts: {
  prisma?: PrismaService;
  otp?: OtpService;
  mail?: MailService;
  audit?: AuditService;
  config?: ConfigService;
  jwt?: JwtService;
  cart?: CartService;
}): Promise<AuthService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: PrismaService,  useValue: opts.prisma  ?? makePrismaMock() },
      { provide: OtpService,     useValue: opts.otp     ?? makeOtpMock() },
      { provide: MailService,    useValue: opts.mail     ?? makeMailMock() },
      { provide: AuditService,   useValue: opts.audit   ?? makeAuditMock() },
      { provide: CartService,    useValue: opts.cart    ?? makeCartMock() },
      { provide: ConfigService,  useValue: opts.config  ?? makeConfigMock({
        JWT_ACCESS_SECRET:  'test-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        JWT_REFRESH_SECRET: 'test-refresh-secret-aaaaaaaaaaaaaaaaaaaaaa',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      }) },
      { provide: JwtService, useValue: opts.jwt ?? makeJwtMock() },
    ],
  }).compile();

  return module.get<AuthService>(AuthService);
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let plainPassword: string;

  beforeAll(async () => {
    plainPassword = 'SecurePass123!';
    MOCK_USER.passwordHash = await bcrypt.hash(plainPassword, 10);
  });

  // ── Login: happy path ──────────────────────────────────────────────────────

  describe('login()', () => {
    it('returns access + refresh tokens on correct credentials', async () => {
      const prisma = makePrismaMock();
      const otp    = makeOtpMock();
      const audit  = makeAuditMock();
      const jwt    = makeJwtMock();

      const svc = await buildModule({ prisma, otp, audit, jwt });
      const result = await svc.login({ email: MOCK_USER.email, password: plainPassword });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.id).toBe(MOCK_USER.id);

      // Login success should be audited
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_SUCCESS', targetId: MOCK_USER.id }),
      );
      // Login attempts counter should be reset
      expect(otp.resetLoginAttempts).toHaveBeenCalledWith(MOCK_USER.email);
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      const prisma = makePrismaMock(null);   // user not found
      const otp    = makeOtpMock();
      const audit  = makeAuditMock();

      const svc = await buildModule({ prisma, otp, audit });

      await expect(
        svc.login({ email: 'nobody@example.com', password: 'any' }),
      ).rejects.toMatchObject({ errorCode: 'VH-2001' });

      expect(otp.recordFailedLogin).toHaveBeenCalledWith('nobody@example.com');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED', metadata: expect.objectContaining({ reason: 'user_not_found' }) }),
      );
    });

    it('throws UnauthorizedException and increments counter on wrong password', async () => {
      const prisma = makePrismaMock();
      const otp    = makeOtpMock({ failResult: { locked: false, lockoutMs: 0 } });
      const audit  = makeAuditMock();

      const svc = await buildModule({ prisma, otp, audit });

      await expect(
        svc.login({ email: MOCK_USER.email, password: 'WrongPassword!' }),
      ).rejects.toMatchObject({ errorCode: 'VH-2001' });

      expect(otp.recordFailedLogin).toHaveBeenCalledWith(MOCK_USER.email);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED', metadata: expect.objectContaining({ reason: 'wrong_password' }) }),
      );
    });

    it('sends security alert email and logs ACCOUNT_LOCKED when threshold is reached', async () => {
      const prisma = makePrismaMock();
      const mail   = makeMailMock();
      const audit  = makeAuditMock();
      // Simulate: this attempt pushes us over the limit
      const otp = makeOtpMock({ failResult: { locked: true, lockoutMs: 15 * 60 * 1000 } });

      const svc = await buildModule({ prisma, otp, mail, audit });

      await expect(
        svc.login({ email: MOCK_USER.email, password: 'WrongPassword!' }),
      ).rejects.toMatchObject({ errorCode: 'VH-2001' });

      expect(mail.sendSecurityAlert).toHaveBeenCalledWith(MOCK_USER.email, 15);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ACCOUNT_LOCKED', targetId: MOCK_USER.id }),
      );
    });

    it('throws 429 when account is already locked', async () => {
      const prisma = makePrismaMock();
      // loginLockoutRemaining > 0 means already locked
      const otp = makeOtpMock({ lockoutMs: 10 * 60 * 1000 });

      const svc = await buildModule({ prisma, otp });

      await expect(
        svc.login({ email: MOCK_USER.email, password: plainPassword }),
      ).rejects.toThrow(/Too many failed attempts/);
    });
  });

  // ── Register ──────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('creates a new user and returns sanitised profile', async () => {
      const prisma = makePrismaMock(null);   // no existing user
      const svc    = await buildModule({ prisma });

      const result = await svc.register({
        email: 'new@vibehub.io',
        password: 'StrongPass99!',
        termsAccepted: true,
        privacyAccepted: true,
      });

      // register() uses `select` so passwordHash is never returned
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('throws ConflictException when email already exists', async () => {
      // user.findUnique returns an existing user → conflict
      const prisma = makePrismaMock();
      const svc    = await buildModule({ prisma });

      await expect(
        svc.register({ email: MOCK_USER.email, password: 'AnyPass1!', termsAccepted: true, privacyAccepted: true }),
      ).rejects.toMatchObject({ errorCode: 'VH-2002' });

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });
});
