/**
 * CartService — Comprehensive Unit Tests
 * ───────────────────────────────────────
 * Covers: Redis read/write, all CRUD paths, stock guard,
 *         product availability guards, enrichment, edge cases.
 *
 * Monkey tests: qty=0 remove, variant-not-in-cart update,
 *               exceed-stock accumulation, deleted variants silently skipped.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CartService } from '../cart.service';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Redis mock ───────────────────────────────────────────────────────────────

const store: Record<string, string> = {};

// ioredis is a default export — must expose both module default and constructor
const mockRedisInstance = {
  get: jest.fn(async (key: string) => store[key] ?? null),
  set: jest.fn(async (key: string, val: string, ..._args: any[]) => { store[key] = val; return 'OK'; }),
  del: jest.fn(async (key: string) => { delete store[key]; return 1; }),
};

const MockRedis = jest.fn().mockImplementation(() => mockRedisInstance);

jest.mock('ioredis', () => {
  // CommonJS interop: module itself is the constructor, .default also points to it
  const ctor: any = jest.fn().mockImplementation(() => mockRedisInstance);
  ctor.default = ctor;
  return ctor;
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VARIANT_ID  = 'var-001';
const VARIANT_ID2 = 'var-002';
const USER_ID     = 'user-abc';

function makeVariant(overrides: any = {}) {
  return {
    id:          overrides.id      ?? VARIANT_ID,
    sku:         overrides.sku     ?? 'SKU-001',
    stockQty:    overrides.stockQty ?? 10,
    priceOverride: overrides.priceOverride ?? null,
    attributes:  overrides.attributes ?? { color: 'red' },
    product: {
      id:       'prod-001',
      title:    'Test Product',
      images:   ['img.jpg'],
      price:    99.99,
      status:   overrides.productStatus ?? 'LIVE',
      tenantId: 'tenant-001',
      tenant: {
        displayName: 'Test Store',
        status:      overrides.tenantStatus ?? 'ACTIVE',
      },
    },
  };
}

function makePrisma(variantOverride?: any) {
  const v = makeVariant(variantOverride);
  return {
    productVariant: {
      findUnique: jest.fn().mockResolvedValue(v),
      findMany:   jest.fn().mockResolvedValue([v]),
    },
  } as unknown as PrismaService;
}

function makeConfig() {
  return {
    get: jest.fn((key: string, def?: any) => def ?? ''),
  } as unknown as ConfigService;
}

async function buildService(prismaOverride?: any): Promise<CartService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CartService,
      { provide: PrismaService,  useValue: prismaOverride ?? makePrisma() },
      { provide: ConfigService,  useValue: makeConfig() },
    ],
  }).compile();
  return module.get<CartService>(CartService);
}

// Reset Redis store between tests
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  jest.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CartService', () => {

  // ── getCart ──────────────────────────────────────────────────────────────────

  describe('getCart()', () => {
    it('returns empty array when cart does not exist', async () => {
      const svc = await buildService();
      const result = await svc.getCart(USER_ID);
      expect(result).toEqual([]);
    });

    it('returns enriched cart items for existing entries', async () => {
      // Pre-seed Redis
      store[`cart:${USER_ID}`] = JSON.stringify([{ variantId: VARIANT_ID, qty: 2 }]);
      const svc = await buildService();
      const result = await svc.getCart(USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].variantId).toBe(VARIANT_ID);
      expect(result[0].qty).toBe(2);
      expect(result[0].lineTotal).toBe(99.99 * 2); // base price × qty
    });

    it('silently skips deleted variants (not in DB)', async () => {
      store[`cart:${USER_ID}`] = JSON.stringify([{ variantId: 'GHOST-VAR', qty: 1 }]);
      const prisma = makePrisma();
      // findMany returns nothing for ghost variant
      (prisma.productVariant.findMany as jest.Mock).mockResolvedValue([]);
      const svc = await buildService(prisma);
      const result = await svc.getCart(USER_ID);
      expect(result).toEqual([]);
    });

    it('uses priceOverride when set', async () => {
      store[`cart:${USER_ID}`] = JSON.stringify([{ variantId: VARIANT_ID, qty: 1 }]);
      const prisma = makePrisma({ priceOverride: 49.99 });
      const svc = await buildService(prisma);
      const result = await svc.getCart(USER_ID);
      expect(result[0].lineTotal).toBe(49.99);
      expect(result[0].variant.priceOverride).toBe(49.99);
    });
  });

  // ── addItem ───────────────────────────────────────────────────────────────────

  describe('addItem()', () => {
    it('adds a new item to an empty cart', async () => {
      const svc = await buildService();
      const result = await svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 3 });
      expect(result).toHaveLength(1);
      expect(result[0].qty).toBe(3);
    });

    it('accumulates qty when adding same variant twice', async () => {
      const svc = await buildService();
      await svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 2 });
      const result = await svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 3 });
      expect(result[0].qty).toBe(5);
    });

    it('throws BadRequestException when product is not LIVE', async () => {
      const svc = await buildService(makePrisma({ productStatus: 'DRAFT' }));
      await expect(svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 1 }))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when store is not ACTIVE', async () => {
      const svc = await buildService(makePrisma({ tenantStatus: 'SUSPENDED' }));
      await expect(svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 1 }))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when qty exceeds stock', async () => {
      const svc = await buildService(makePrisma({ stockQty: 2 }));
      await expect(svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 5 }))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when accumulated qty would exceed stock', async () => {
      const svc = await buildService(makePrisma({ stockQty: 3 }));
      await svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 2 });
      await expect(svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 2 }))
        .rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when variant does not exist', async () => {
      const prisma = makePrisma();
      (prisma.productVariant.findUnique as jest.Mock).mockResolvedValue(null);
      const svc = await buildService(prisma);
      await expect(svc.addItem(USER_ID, { variantId: 'GHOST', qty: 1 }))
        .rejects.toThrow(NotFoundException);
    });

    it('allows adding exactly the full stock qty', async () => {
      const svc = await buildService(makePrisma({ stockQty: 5 }));
      const result = await svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 5 });
      expect(result[0].qty).toBe(5);
    });

    it('handles multiple distinct variants in cart', async () => {
      const prisma = makePrisma();
      const v2 = makeVariant({ id: VARIANT_ID2 });
      (prisma.productVariant.findUnique as jest.Mock)
        .mockResolvedValueOnce(makeVariant())
        .mockResolvedValueOnce(v2);
      (prisma.productVariant.findMany as jest.Mock)
        .mockResolvedValue([makeVariant(), v2]);

      const svc = await buildService(prisma);
      await svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 1 });
      const result = await svc.addItem(USER_ID, { variantId: VARIANT_ID2, qty: 2 });
      expect(result).toHaveLength(2);
    });
  });

  // ── updateItem ────────────────────────────────────────────────────────────────

  describe('updateItem()', () => {
    it('updates qty of existing item', async () => {
      store[`cart:${USER_ID}`] = JSON.stringify([{ variantId: VARIANT_ID, qty: 1 }]);
      const svc = await buildService();
      const result = await svc.updateItem(USER_ID, VARIANT_ID, { qty: 4 });
      expect(result[0].qty).toBe(4);
    });

    it('removes item when qty is set to 0', async () => {
      store[`cart:${USER_ID}`] = JSON.stringify([{ variantId: VARIANT_ID, qty: 3 }]);
      const svc = await buildService();
      const result = await svc.updateItem(USER_ID, VARIANT_ID, { qty: 0 });
      expect(result).toEqual([]);
      // Redis key should be deleted
      expect(store[`cart:${USER_ID}`]).toBeUndefined();
    });

    it('throws NotFoundException when item is not in cart', async () => {
      const svc = await buildService();
      await expect(svc.updateItem(USER_ID, 'MISSING', { qty: 1 }))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when new qty exceeds stock', async () => {
      store[`cart:${USER_ID}`] = JSON.stringify([{ variantId: VARIANT_ID, qty: 1 }]);
      const svc = await buildService(makePrisma({ stockQty: 3 }));
      await expect(svc.updateItem(USER_ID, VARIANT_ID, { qty: 10 }))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ── removeItem ────────────────────────────────────────────────────────────────

  describe('removeItem()', () => {
    it('removes a specific item from cart', async () => {
      store[`cart:${USER_ID}`] = JSON.stringify([
        { variantId: VARIANT_ID,  qty: 1 },
        { variantId: VARIANT_ID2, qty: 2 },
      ]);
      const prisma = makePrisma();
      const v2 = makeVariant({ id: VARIANT_ID2 });
      (prisma.productVariant.findMany as jest.Mock).mockResolvedValue([v2]);
      const svc = await buildService(prisma);
      const result = await svc.removeItem(USER_ID, VARIANT_ID);
      expect(result).toHaveLength(1);
      expect(result[0].variantId).toBe(VARIANT_ID2);
    });

    it('no-ops when removing a variant not in cart', async () => {
      store[`cart:${USER_ID}`] = JSON.stringify([{ variantId: VARIANT_ID, qty: 1 }]);
      const svc = await buildService();
      // Should not throw
      const result = await svc.removeItem(USER_ID, 'NOT-IN-CART');
      expect(result).toHaveLength(1);
    });
  });

  // ── clearCart ─────────────────────────────────────────────────────────────────

  describe('clearCart()', () => {
    it('deletes the cart from Redis', async () => {
      store[`cart:${USER_ID}`] = JSON.stringify([{ variantId: VARIANT_ID, qty: 1 }]);
      const svc = await buildService();
      await svc.clearCart(USER_ID);
      expect(store[`cart:${USER_ID}`]).toBeUndefined();
    });

    it('does not throw when cart is already empty', async () => {
      const svc = await buildService();
      await expect(svc.clearCart(USER_ID)).resolves.toBeUndefined();
    });
  });

  // ── getRawEntries ─────────────────────────────────────────────────────────────

  describe('getRawEntries()', () => {
    it('returns raw entries without DB enrichment', async () => {
      const entries = [{ variantId: VARIANT_ID, qty: 3 }];
      store[`cart:${USER_ID}`] = JSON.stringify(entries);
      const svc = await buildService();
      const result = await svc.getRawEntries(USER_ID);
      expect(result).toEqual(entries);
    });

    it('returns empty array for non-existent cart', async () => {
      const svc = await buildService();
      const result = await svc.getRawEntries(USER_ID);
      expect(result).toEqual([]);
    });
  });
});
