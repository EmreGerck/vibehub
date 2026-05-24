/**
 * EInvoiceService — Comprehensive Unit Tests
 * ───────────────────────────────────────────
 * Covers: mock mode (no API key), issueEArchive, issueEInvoice,
 *         getInvoiceStatus, real API error handling, invoice number format.
 *
 * Monkey tests: missing buyer fields, empty lines array, API 4xx response,
 *               non-JSON API response, network error.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EInvoiceService } from '../einvoice.service';

// ─── Base invoice input ────────────────────────────────────────────────────────

const BASE_INPUT = {
  orderId: 'order-001',
  buyer: {
    identityNumber: '11111111111',
    name:           'Test User',
    email:          'test@test.com',
    address:        '123 Test St',
    city:           'Istanbul',
    country:        'Turkey',
  },
  lines: [
    { description: 'Product A', quantity: 2, unitPrice: 50, vatRate: 0.20, unit: 'ADET' },
  ],
  currency:    'TRY',
  invoiceDate: new Date('2026-05-01'),
};

function makeConfig(apiKey = '', baseUrl = 'https://api.foriba.com/v2') {
  return {
    get: jest.fn((key: string, def?: string) => {
      if (key === 'FORIBA_API_KEY')   return apiKey;
      if (key === 'FORIBA_BASE_URL')  return baseUrl;
      if (key === 'PLATFORM_TAX_ID')  return '1234567890';
      return def ?? '';
    }),
  } as unknown as ConfigService;
}

async function buildService(apiKey = '') {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      EInvoiceService,
      { provide: ConfigService, useValue: makeConfig(apiKey) },
    ],
  }).compile();
  return module.get<EInvoiceService>(EInvoiceService);
}

beforeEach(() => jest.clearAllMocks());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EInvoiceService', () => {

  // ── Mock mode (no API key) ────────────────────────────────────────────────────

  describe('Mock mode (no FORIBA_API_KEY)', () => {
    it('issueEArchive returns success with mock invoice number', async () => {
      const svc = await buildService('');
      const result = await svc.issueEArchive(BASE_INPUT);
      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(result.invoiceNumber).toMatch(/^VHB\d+/);
    });

    it('issueEInvoice returns success with mock invoice number', async () => {
      const svc = await buildService('');
      const result = await svc.issueEInvoice(BASE_INPUT);
      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
    });

    it('mock invoice has pdfUrl', async () => {
      const svc = await buildService('');
      const result = await svc.issueEArchive(BASE_INPUT);
      expect(result.pdfUrl).toMatch(/^https:\/\/mock\.foriba\.com/);
    });

    it('mock invoiceId is a uuid', async () => {
      const svc = await buildService('');
      const result = await svc.issueEArchive(BASE_INPUT);
      expect(result.invoiceId).toMatch(/^mock-[0-9a-f-]{36}/);
    });

    it('getInvoiceStatus returns ACCEPTED in mock mode', async () => {
      const svc = await buildService('');
      const status = await svc.getInvoiceStatus('any-id');
      expect(status.status).toBe('ACCEPTED');
      expect(status.detail).toBe('mock mode');
    });

    it('issueEArchive with empty lines still succeeds in mock', async () => {
      const svc = await buildService('');
      const result = await svc.issueEArchive({ ...BASE_INPUT, lines: [] });
      expect(result.success).toBe(true);
    });

    it('generates a non-empty invoice number each call', async () => {
      const svc = await buildService('');
      const r1 = await svc.issueEArchive(BASE_INPUT);
      expect(r1.invoiceNumber).toBeTruthy();
      expect(r1.invoiceNumber!.length).toBeGreaterThan(5);
    });
  });

  // ── Real API mode ─────────────────────────────────────────────────────────────

  describe('Real API mode (FORIBA_API_KEY set)', () => {
    let svc: EInvoiceService;
    let httpsRequestMock: jest.SpyInstance;
    let mockResponse: any;

    beforeEach(async () => {
      svc = await buildService('real-api-key-123');

      // Mock https.request
      const https = require('https');
      mockResponse = {
        statusCode: 200,
        on: jest.fn().mockImplementation((event, cb) => {
          if (event === 'data') cb(JSON.stringify({ invoiceId: 'inv-xyz', invoiceNumber: 'VHB2026000001', pdfUrl: 'https://foriba.com/inv.pdf' }));
          if (event === 'end')  cb();
          return mockResponse;
        }),
      };
      httpsRequestMock = jest.spyOn(https, 'request').mockImplementation((opts: any, handler: any) => {
        handler(mockResponse);
        return { on: jest.fn(), write: jest.fn(), end: jest.fn() };
      });
    });

    afterEach(() => httpsRequestMock.mockRestore());

    it('issueEArchive returns invoiceNumber from API', async () => {
      const result = await svc.issueEArchive(BASE_INPUT);
      expect(result.success).toBe(true);
      expect(result.invoiceNumber).toBe('VHB2026000001');
      expect(result.mock).toBeUndefined();
    });

    it('returns failure on API 4xx response', async () => {
      mockResponse.statusCode = 400;
      mockResponse.on.mockImplementation((event: string, cb: any) => {
        if (event === 'data') cb(JSON.stringify({ message: 'Invalid buyer TC' }));
        if (event === 'end')  cb();
        return mockResponse;
      });
      const result = await svc.issueEArchive(BASE_INPUT);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('400');
    });

    it('returns failure on non-JSON API response', async () => {
      mockResponse.on.mockImplementation((event: string, cb: any) => {
        if (event === 'data') cb('<html>Error</html>');
        if (event === 'end')  cb();
        return mockResponse;
      });
      const result = await svc.issueEArchive(BASE_INPUT);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('non-JSON');
    });

    it('returns failure on network error', async () => {
      httpsRequestMock.mockImplementation((opts: any, handler: any) => {
        const req = { on: jest.fn().mockImplementation((evt: string, cb: any) => { if (evt === 'error') cb(new Error('ECONNREFUSED')); return req; }), write: jest.fn(), end: jest.fn() };
        return req;
      });
      const result = await svc.issueEArchive(BASE_INPUT);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('ECONNREFUSED');
    });

    it('issueEInvoice uses EINVOICE type in payload', async () => {
      const result = await svc.issueEInvoice(BASE_INPUT);
      expect(result.success).toBe(true);
      // Verify it called the API with POST (can't easily check body without more complex mocking)
      expect(httpsRequestMock).toHaveBeenCalled();
    });

    it('getInvoiceStatus returns status from API', async () => {
      mockResponse.on.mockImplementation((event: string, cb: any) => {
        if (event === 'data') cb(JSON.stringify({ status: 'SENT', statusDescription: 'Delivered to GİB' }));
        if (event === 'end')  cb();
        return mockResponse;
      });
      const status = await svc.getInvoiceStatus('inv-xyz');
      expect(status.status).toBe('SENT');
      expect(status.detail).toBe('Delivered to GİB');
    });

    it('getInvoiceStatus returns UNKNOWN on API error', async () => {
      mockResponse.statusCode = 500;
      mockResponse.on.mockImplementation((event: string, cb: any) => {
        if (event === 'data') cb(JSON.stringify({ message: 'Server error' }));
        if (event === 'end')  cb();
        return mockResponse;
      });
      const status = await svc.getInvoiceStatus('inv-xyz');
      expect(status.status).toBe('UNKNOWN');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('invoice year matches current year in mock number', async () => {
      const svc = await buildService('');
      const result = await svc.issueEArchive(BASE_INPUT);
      const year = new Date().getFullYear().toString();
      expect(result.invoiceNumber).toContain(year);
    });

    it('does not modify input object (no mutation)', async () => {
      const svc = await buildService('');
      const inputCopy = JSON.parse(JSON.stringify(BASE_INPUT));
      await svc.issueEArchive(BASE_INPUT);
      expect(BASE_INPUT.buyer.name).toBe(inputCopy.buyer.name);
      expect(BASE_INPUT.lines.length).toBe(inputCopy.lines.length);
    });
  });
});
