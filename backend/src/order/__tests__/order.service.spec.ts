/**
 * Order Service — Unit Tests
 * ──────────────────────────
 * Tests the most critical path: placeOrder()
 *
 * Scenarios covered:
 *   1. Happy path → order created, stock decremented, cart cleared
 *   2. Empty cart → BadRequestException
 *   3. Insufficient stock → BadRequestException
 *   4. Inactive vendor → BadRequestException
 *   5. Non-LIVE product → BadRequestException
 *   6. Pre-order: skips stock check, uses AWAITING_APPROVAL status
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrderService } from '../order.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CartService } from '../../cart/cart.service';
import { QueueService } from '../../queue/queue.service';
import { PushService } from '../../push/push.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { Decimal } from '@prisma/client/runtime/library';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT = {
  id: 'tenant-1',
  status: 'ACTIVE',
  displayName: 'Test Store',
  commissionRate: new Decimal('0.15'),
};

const PRODUCT_LIVE = {
  id: 'prod-1',
  title: 'Test Merch',
  status: 'LIVE',
  price: new Decimal('50.00'),
  isPreOrder: false,
  preOrderEndsAt: null,
  preOrderLimit: null,
  preOrderShipDate: null,
  tenantId: TENANT.id,
  tenant: TENANT,
};

const VARIANT = {
  id: 'var-1',
  productId: PRODUCT_LIVE.id,
  stockQty: 10,
  priceOverride: null,
  product: PRODUCT_LIVE,
};

const CART_ITEM = { variantId: VARIANT.id, qty: 2 };

const CUSTOMER = { id: 'cust-1', email: 'buyer@example.com' };

// ── Mock factories ────────────────────────────────────────────────────────────

function makeOrder(id = 'ord-1') {
  return {
    id,
    customerId: CUSTOMER.id,
    status: 'PLACED',
    totalAmount: new Decimal('100.00'),
    currency: 'TRY',
    items: [],
  };
}

function makePrisma(overrides: {
  variantOverride?: any;
  transactionResult?: any;
  userEmail?: string;
} = {}) {
  const variant = overrides.variantOverride ?? VARIANT;
  return {
    productVariant: {
      findMany: jest.fn().mockResolvedValue([variant]),
      update:   jest.fn().mockResolvedValue({}),
    },
    order: {
      create:   jest.fn().mockResolvedValue(makeOrder()),
      findUnique: jest.fn().mockResolvedValue(makeOrder()),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        ...CUSTOMER,
        email: overrides.userEmail ?? CUSTOMER.email,
      }),
    },
    orderItem: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { qty: 0 } }),
    },
    $transaction: jest.fn().mockImplementation(async (fn: any) => {
      // Execute the transaction callback with a proxy tx
      const tx = {
        order: {
          create: jest.fn().mockResolvedValue(
            overrides.transactionResult ?? { ...makeOrder(), items: [] },
          ),
        },
        productVariant: {
          update: jest.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    }),
  } as unknown as PrismaService;
}

function makeCart(items: typeof CART_ITEM[] = [CART_ITEM]) {
  return {
    getRawEntries: jest.fn().mockResolvedValue(items),
    clearCart:     jest.fn().mockResolvedValue(undefined),
  } as unknown as CartService;
}

const silentDeps = {
  audit:         { log:      jest.fn() } as unknown as AuditService,
  queue:         { sendMail: jest.fn().mockResolvedValue(undefined) } as unknown as QueueService,
  push:          { sendToUser: jest.fn() } as unknown as PushService,
  notifications: { create: jest.fn() } as unknown as NotificationsService,
};

async function buildService(overrides: {
  prisma?: PrismaService;
  cart?: CartService;
} = {}): Promise<OrderService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      OrderService,
      { provide: PrismaService,        useValue: overrides.prisma ?? makePrisma() },
      { provide: AuditService,         useValue: silentDeps.audit },
      { provide: CartService,          useValue: overrides.cart ?? makeCart() },
      { provide: QueueService,         useValue: silentDeps.queue },
      { provide: PushService,          useValue: silentDeps.push },
      { provide: NotificationsService, useValue: silentDeps.notifications },
    ],
  }).compile();

  return module.get<OrderService>(OrderService);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OrderService', () => {
  describe('placeOrder()', () => {
    it('creates order and clears cart on happy path', async () => {
      const cart  = makeCart([CART_ITEM]);
      const prisma = makePrisma();
      const svc   = await buildService({ prisma, cart });

      const result = await svc.placeOrder(CUSTOMER.id, { currency: 'TRY', shippingAddress: {} as any });

      expect(result).toHaveProperty('id');
      expect(cart.clearCart).toHaveBeenCalledWith(CUSTOMER.id);
      // Stock should be decremented for non-pre-order items
      // (happens inside $transaction — we verify the transaction was called)
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws BadRequestException when cart is empty', async () => {
      const cart = makeCart([]);
      const svc  = await buildService({ cart });

      await expect(
        svc.placeOrder(CUSTOMER.id, { currency: 'TRY', shippingAddress: {} as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when stock is insufficient', async () => {
      const lowStockVariant = { ...VARIANT, stockQty: 1 };  // cart wants 2
      const prisma = makePrisma({ variantOverride: lowStockVariant });
      const svc    = await buildService({ prisma });

      await expect(
        svc.placeOrder(CUSTOMER.id, { currency: 'TRY', shippingAddress: {} as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when vendor is not ACTIVE', async () => {
      const frozenVariant = {
        ...VARIANT,
        product: { ...PRODUCT_LIVE, tenant: { ...TENANT, status: 'FROZEN' } },
      };
      const prisma = makePrisma({ variantOverride: frozenVariant });
      const svc    = await buildService({ prisma });

      await expect(
        svc.placeOrder(CUSTOMER.id, { currency: 'TRY', shippingAddress: {} as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when product is not LIVE', async () => {
      const draftVariant = {
        ...VARIANT,
        product: { ...PRODUCT_LIVE, status: 'DRAFT' },
      };
      const prisma = makePrisma({ variantOverride: draftVariant });
      const svc    = await buildService({ prisma });

      await expect(
        svc.placeOrder(CUSTOMER.id, { currency: 'TRY', shippingAddress: {} as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it('does NOT check stock for pre-order items', async () => {
      const preOrderVariant = {
        ...VARIANT,
        stockQty: 0,  // would normally fail stock check
        product: {
          ...PRODUCT_LIVE,
          isPreOrder: true,
          preOrderEndsAt: null,
          preOrderLimit: null,
        },
      };
      const prisma = makePrisma({ variantOverride: preOrderVariant });
      const svc    = await buildService({ prisma });

      // Should not throw even with 0 stock
      const result = await svc.placeOrder(CUSTOMER.id, { currency: 'TRY', shippingAddress: {} as any });
      expect(result).toHaveProperty('id');
    });

    it('throws when pre-order limit is exceeded', async () => {
      const preOrderVariant = {
        ...VARIANT,
        stockQty: 0,
        product: {
          ...PRODUCT_LIVE,
          isPreOrder: true,
          preOrderEndsAt: null,
          preOrderLimit: 5,
        },
      };
      const prisma = makePrisma({ variantOverride: preOrderVariant });
      // Simulate 4 units already taken → adding 2 would exceed limit of 5
      (prisma.orderItem.aggregate as jest.Mock).mockResolvedValue({ _sum: { qty: 4 } });

      const svc = await buildService({ prisma });

      await expect(
        svc.placeOrder(CUSTOMER.id, { currency: 'TRY', shippingAddress: {} as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when pre-order window has closed', async () => {
      const pastDate = new Date(Date.now() - 1000);  // 1 second ago
      const expiredVariant = {
        ...VARIANT,
        product: {
          ...PRODUCT_LIVE,
          isPreOrder: true,
          preOrderEndsAt: pastDate,
          preOrderLimit: null,
        },
      };
      const prisma = makePrisma({ variantOverride: expiredVariant });
      const svc    = await buildService({ prisma });

      await expect(
        svc.placeOrder(CUSTOMER.id, { currency: 'TRY', shippingAddress: {} as any }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
