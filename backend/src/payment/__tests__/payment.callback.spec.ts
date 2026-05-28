/**
 * Payment Controller — Callback Unit Tests
 * ─────────────────────────────────────────
 * Tests the İyzico webhook callback handler in isolation.
 *
 * Scenarios:
 *   1. Valid callback with mock token → order moved to CONFIRMED
 *   2. Missing token → BadRequestException
 *   3. Invalid HMAC signature → ForbiddenException
 *   4. Payment verification failure → order stays PLACED
 *   5. Callback for already-confirmed order → no double-update
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentController } from '../payment.controller';
import { IyzicoService } from '../iyzico.service';
import { EInvoiceService } from '../../einvoice/einvoice.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ORDER_ID    = 'order-abc123';
const CONV_ID     = `conv-${ORDER_ID}`;
const SECRET_KEY  = 'test-secret-32charslong!!!!!!!!!';

const PLACED_ORDER = {
  id:         ORDER_ID,
  status:     'PLACED',
  customerId: 'cust-1',
  totalAmount: 100,
  currency:   'TRY',
  paymentRef: null,
};

// ── Mock factories ────────────────────────────────────────────────────────────

function makeIyzico(success = true, conversationId = CONV_ID) {
  return {
    initiatePayment: jest.fn(),
    verifyPayment: jest.fn().mockResolvedValue({
      success,
      status:        success ? 'success' : 'failure',
      paymentId:     'pay-999',
      conversationId,
      paidPrice:     100,
      currency:      'TRY',
    }),
    refundPayment: jest.fn(),
  } as unknown as IyzicoService;
}

const FULL_ORDER_WITH_ITEMS = {
  ...PLACED_ORDER,
  customer: { email: 'test@test.com', name: 'Test User' },
  items:    [],
  shippingAddress: { line1: '123 Test St', city: 'Istanbul', country: 'Turkey' },
};

function makePrisma(orderOverride?: any) {
  return {
    order: {
      // First call returns the plain order for status check;
      // subsequent calls (from _autoIssueInvoice) return the full order with items.
      findUnique: jest.fn()
        .mockResolvedValueOnce(orderOverride ?? PLACED_ORDER)
        .mockResolvedValue(FULL_ORDER_WITH_ITEMS),
      update:     jest.fn().mockResolvedValue({ ...PLACED_ORDER, status: 'CONFIRMED' }),
    },
  } as unknown as PrismaService;
}

function makeConfig(nodeEnv = 'test', secretKey = '') {
  return {
    get: jest.fn().mockImplementation((key: string, def?: string) => {
      if (key === 'NODE_ENV')           return nodeEnv;
      if (key === 'IYZICO_SECRET_KEY')  return secretKey;
      return def ?? '';
    }),
  } as unknown as ConfigService;
}

function makeRequest(body: any, signatureHeader?: string, secretKey?: string) {
  const headers: Record<string, string> = {};
  if (signatureHeader !== undefined) {
    headers['x-iyzico-signature'] = signatureHeader;
  } else if (secretKey) {
    // Auto-compute correct HMAC
    headers['x-iyzico-signature'] = crypto
      .createHmac('sha256', secretKey)
      .update(JSON.stringify(body))
      .digest('base64');
  }
  return { body, headers } as any;
}

const mockEInvoice = {
  issueEArchive: jest.fn().mockResolvedValue({ success: true, invoiceNumber: 'VHB2026001', mock: true }),
  issueEInvoice: jest.fn().mockResolvedValue({ success: true, invoiceNumber: 'VHB2026002', mock: true }),
  getInvoiceStatus: jest.fn().mockResolvedValue({ status: 'ACCEPTED' }),
} as unknown as EInvoiceService;

const mockMail = { sendMail: jest.fn().mockResolvedValue(undefined) } as unknown as MailService;

async function buildController(opts: {
  iyzico?: IyzicoService;
  prisma?: PrismaService;
  config?: ConfigService;
  einvoice?: EInvoiceService;
  mail?: MailService;
}): Promise<PaymentController> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [PaymentController],
    providers: [
      { provide: IyzicoService,   useValue: opts.iyzico   ?? makeIyzico() },
      { provide: PrismaService,   useValue: opts.prisma   ?? makePrisma() },
      { provide: ConfigService,   useValue: opts.config   ?? makeConfig() },
      { provide: EInvoiceService, useValue: opts.einvoice ?? mockEInvoice },
      { provide: MailService,     useValue: opts.mail     ?? mockMail },
    ],
  }).compile();

  return module.get<PaymentController>(PaymentController);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PaymentController — callback()', () => {
  it('confirms a PLACED order on successful verification', async () => {
    const iyzico = makeIyzico(true, CONV_ID);
    const prisma = makePrisma(PLACED_ORDER);
    const ctrl   = await buildController({ iyzico, prisma });

    const req    = makeRequest({ token: 'tok-mock-abc' });
    const result = await ctrl.callback(req);

    expect(result.data).toEqual({ received: true });
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ORDER_ID },
        data:  expect.objectContaining({ status: 'CONFIRMED', paymentRef: 'pay-999' }),
      }),
    );
  });

  it('throws BadRequestException when token is missing', async () => {
    const ctrl = await buildController({});
    const req  = makeRequest({});  // no token

    await expect(ctrl.callback(req)).rejects.toThrow(BadRequestException);
  });

  it('does NOT update order when İyzico verification fails', async () => {
    const iyzico = makeIyzico(false);  // payment failed
    const prisma = makePrisma(PLACED_ORDER);
    const ctrl   = await buildController({ iyzico, prisma });

    const req = makeRequest({ token: 'tok-failed' });
    await ctrl.callback(req);

    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('does NOT update an already-CONFIRMED order (idempotent)', async () => {
    const iyzico = makeIyzico(true, CONV_ID);
    const prisma = makePrisma({ ...PLACED_ORDER, status: 'CONFIRMED' });
    const ctrl   = await buildController({ iyzico, prisma });

    const req = makeRequest({ token: 'tok-duplicate' });
    await ctrl.callback(req);

    // Order is already CONFIRMED — guard prevents double update
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException on invalid HMAC signature (when secret is configured)', async () => {
    const config = makeConfig('test', SECRET_KEY);
    const ctrl   = await buildController({ config });

    const req = makeRequest(
      { token: 'tok-xyz' },
      'WRONG_SIGNATURE_BASE64',  // deliberately incorrect
    );

    await expect(ctrl.callback(req)).rejects.toThrow(ForbiddenException);
  });

  it('accepts callback with correct HMAC signature', async () => {
    const body   = { token: 'tok-signed' };
    const iyzico = makeIyzico(true, CONV_ID);
    const prisma = makePrisma(PLACED_ORDER);
    const config = makeConfig('test', SECRET_KEY);
    const ctrl   = await buildController({ iyzico, prisma, config });

    // makeRequest auto-computes correct HMAC when secretKey is passed
    const req = makeRequest(body, undefined, SECRET_KEY);

    const result = await ctrl.callback(req);
    expect(result.data).toEqual({ received: true });
  });

  it('skips signature check when no secret key is configured (dev mode)', async () => {
    const config = makeConfig('test', '');  // no secret
    const iyzico = makeIyzico(false);       // payment fails but no sig error
    const ctrl   = await buildController({ config, iyzico });

    const req = makeRequest({ token: 'tok-nosig' });
    // Should not throw ForbiddenException — just process normally
    await expect(ctrl.callback(req)).resolves.toBeDefined();
  });
});
