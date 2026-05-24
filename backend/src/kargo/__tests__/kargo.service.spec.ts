/**
 * KargoService — Comprehensive Unit Tests
 * ──────────────────────────────────────────
 * Covers: createShipment (mock, Aras, Yurtiçi), trackShipment,
 *         getOrderShipments, getTenantShipments, DB persist, status update.
 *
 * IF branches: carrier selection logic (aras key present, yurtici key present,
 *              neither → mock), API success, API failure, network error,
 *              mock tracking format.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KargoService } from '../kargo.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_PARAMS = {
  orderId:          'order-001',
  tenantId:         'tenant-001',
  receiverName:     'John Doe',
  receiverPhone:    '05551234567',
  receiverAddress:  '123 Test St',
  receiverCity:     'Istanbul',
  receiverDistrict: 'Kadıköy',
  weight:           1.5,
  description:      'Test parcel',
};

function makeConfig(opts: { arasKey?: string; yurticiUser?: string; defaultCarrier?: string } = {}) {
  return {
    get: jest.fn((key: string, def?: string) => {
      if (key === 'ARAS_KARGO_API_KEY')         return opts.arasKey ?? '';
      if (key === 'ARAS_KARGO_CUSTOMER_CODE')    return 'CUST-001';
      if (key === 'YURTICI_KARGO_USER')          return opts.yurticiUser ?? '';
      if (key === 'YURTICI_KARGO_PASS')          return opts.yurticiUser ? 'pass' : '';
      if (key === 'YURTICI_KARGO_MERCHANT_CODE') return 'MERCHANT-001';
      if (key === 'DEFAULT_CARRIER')             return opts.defaultCarrier ?? 'aras';
      return def ?? '';
    }),
  } as unknown as ConfigService;
}

function makePrisma(): PrismaService {
  return {
    shipment: {
      create:   jest.fn().mockResolvedValue({ id: 'ship-1' }),
      findMany: jest.fn().mockResolvedValue([{ id: 'ship-1', trackingNumber: 'MOCK-123' }]),
      count:    jest.fn().mockResolvedValue(1),
    },
    order: {
      update: jest.fn().mockResolvedValue({ id: 'order-001', status: 'SHIPPED' }),
    },
  } as unknown as PrismaService;
}

const mockMail = { sendMail: jest.fn().mockResolvedValue(undefined) } as unknown as MailService;

async function buildService(configOpts?: any, prismaOverride?: any): Promise<KargoService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      KargoService,
      { provide: ConfigService, useValue: makeConfig(configOpts) },
      { provide: PrismaService, useValue: prismaOverride ?? makePrisma() },
      { provide: MailService,   useValue: mockMail },
    ],
  }).compile();
  return module.get<KargoService>(KargoService);
}

// ─── Mock https ───────────────────────────────────────────────────────────────

function mockHttpsSuccess(body: any) {
  const https = require('https');
  const mockResponse = {
    statusCode: 200,
    on: jest.fn().mockImplementation((event: string, cb: any) => {
      if (event === 'data') cb(JSON.stringify(body));
      if (event === 'end')  cb();
      return mockResponse;
    }),
  };
  jest.spyOn(https, 'request').mockImplementation((_opts: any, handler: any) => {
    handler(mockResponse);
    return { on: jest.fn(), write: jest.fn(), end: jest.fn() };
  });
}

function mockHttpsError(message: string) {
  const https = require('https');
  jest.spyOn(https, 'request').mockImplementation((_opts: any) => {
    const req = {
      on: jest.fn().mockImplementation((event: string, cb: any) => {
        if (event === 'error') cb(new Error(message));
        return req;
      }),
      write: jest.fn(),
      end:   jest.fn(),
    };
    return req;
  });
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('KargoService', () => {

  // ── Mock mode (no credentials) ────────────────────────────────────────────────

  describe('createShipment() — mock mode', () => {
    it('returns success with MOCK- tracking number', async () => {
      const svc = await buildService();
      const result = await svc.createShipment(BASE_PARAMS);
      expect(result.success).toBe(true);
      expect(result.trackingNumber).toMatch(/^MOCK-ARAS-/);
      expect(result.mock).toBe(true);
    });

    it('persists shipment to DB', async () => {
      const prisma = makePrisma();
      const svc = await buildService({}, prisma);
      await svc.createShipment(BASE_PARAMS);
      expect(prisma.shipment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-001',
            tenantId: 'tenant-001',
          }),
        }),
      );
    });

    it('updates order status to SHIPPED', async () => {
      const prisma = makePrisma();
      const svc = await buildService({}, prisma);
      await svc.createShipment(BASE_PARAMS);
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SHIPPED' } }),
      );
    });

    it('mock tracking number includes carrier name', async () => {
      const svc = await buildService({ defaultCarrier: 'yurtici' });
      const result = await svc.createShipment(BASE_PARAMS);
      expect(result.trackingNumber).toMatch(/^MOCK-YURTICI-/);
    });

    it('uses carrier param override over default', async () => {
      const svc = await buildService({ defaultCarrier: 'aras' });
      const result = await svc.createShipment({ ...BASE_PARAMS, carrier: 'yurtici' });
      expect(result.trackingNumber).toMatch(/^MOCK-YURTICI-/);
    });

    it('mock result includes labelUrl', async () => {
      const svc = await buildService();
      const result = await svc.createShipment(BASE_PARAMS);
      expect(result.labelUrl).toMatch(/mock-kargo\.vibehub\.dev/);
    });

    it('estimatedDays is 3 for mock', async () => {
      const svc = await buildService();
      const result = await svc.createShipment(BASE_PARAMS);
      expect(result.estimatedDays).toBe(3);
    });
  });

  // ── Aras Kargo API ────────────────────────────────────────────────────────────

  describe('createShipment() — Aras Kargo', () => {
    it('returns success with tracking number from API', async () => {
      mockHttpsSuccess({ Success: true, TakipKodu: 'ARAS-12345678' });
      const svc = await buildService({ arasKey: 'real-aras-key' });
      const result = await svc.createShipment(BASE_PARAMS);
      expect(result.success).toBe(true);
      expect(result.trackingNumber).toBe('ARAS-12345678');
      expect(result.carrier).toBe('aras');
    });

    it('returns failure when API reports error', async () => {
      mockHttpsSuccess({ Success: false, Message: 'Customer not authorized' });
      const svc = await buildService({ arasKey: 'real-aras-key' });
      const result = await svc.createShipment(BASE_PARAMS);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Customer not authorized');
    });

    it('returns failure on network error', async () => {
      mockHttpsError('ECONNREFUSED');
      const svc = await buildService({ arasKey: 'real-aras-key' });
      const result = await svc.createShipment(BASE_PARAMS);
      expect(result.success).toBe(false);
    });

    it('does NOT persist shipment on API failure', async () => {
      mockHttpsSuccess({ Success: false, Message: 'Error' });
      const prisma = makePrisma();
      const svc = await buildService({ arasKey: 'real-aras-key' }, prisma);
      await svc.createShipment(BASE_PARAMS);
      expect(prisma.shipment.create).not.toHaveBeenCalled();
    });
  });

  // ── Yurtiçi Kargo API ─────────────────────────────────────────────────────────

  describe('createShipment() — Yurtiçi Kargo', () => {
    it('returns success with cargoKey from API', async () => {
      mockHttpsSuccess({ isSuccess: true, cargoKey: 'YURTICI-99999' });
      const svc = await buildService({ yurticiUser: 'user123', defaultCarrier: 'yurtici' });
      const result = await svc.createShipment(BASE_PARAMS);
      expect(result.success).toBe(true);
      expect(result.trackingNumber).toBe('YURTICI-99999');
      expect(result.carrier).toBe('yurtici');
    });

    it('returns failure when isSuccess is false', async () => {
      mockHttpsSuccess({ isSuccess: false, message: 'Weight exceeds limit' });
      const svc = await buildService({ yurticiUser: 'user123', defaultCarrier: 'yurtici' });
      const result = await svc.createShipment(BASE_PARAMS);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Weight exceeds limit');
    });
  });

  // ── trackShipment ─────────────────────────────────────────────────────────────

  describe('trackShipment()', () => {
    it('returns mock tracking events when disabled', async () => {
      const svc = await buildService();
      const result = await svc.trackShipment('MOCK-ARAS-123', 'aras');
      expect(result.mock).toBe(true);
      expect(result.events).toHaveLength(2);
      expect(result.trackingNumber).toBe('MOCK-ARAS-123');
    });

    it('returns events from Aras API when key configured', async () => {
      mockHttpsSuccess({
        StatusDescription: 'In Transit',
        ShipmentMoves: [
          { Date: '2026-05-01', Location: 'Istanbul', ShipmentMoveDescription: 'Picked up' },
        ],
      });
      const svc = await buildService({ arasKey: 'real-key' });
      const result = await svc.trackShipment('ARAS-123', 'aras');
      expect(result.status).toBe('In Transit');
      expect(result.events).toHaveLength(1);
      expect(result.events[0].location).toBe('Istanbul');
    });

    it('falls back to mock on Aras API error', async () => {
      mockHttpsError('timeout');
      const svc = await buildService({ arasKey: 'real-key' });
      const result = await svc.trackShipment('ARAS-123', 'aras');
      expect(result.mock).toBe(true);
    });

    it('returns mock when carrier is unknown', async () => {
      const svc = await buildService();
      const result = await svc.trackShipment('XYZ-123', 'fedex');
      expect(result.mock).toBe(true);
      expect(result.carrier).toBe('fedex');
    });
  });

  // ── getOrderShipments ─────────────────────────────────────────────────────────

  describe('getOrderShipments()', () => {
    it('returns shipments for an order', async () => {
      const svc = await buildService();
      const result = await svc.getOrderShipments('order-001');
      expect(result).toHaveLength(1);
    });
  });

  // ── getTenantShipments ────────────────────────────────────────────────────────

  describe('getTenantShipments()', () => {
    it('returns paginated shipments', async () => {
      const svc = await buildService();
      const result = await svc.getTenantShipments('tenant-001', 1, 10);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });
});
