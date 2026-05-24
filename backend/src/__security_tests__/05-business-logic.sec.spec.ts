/**
 * SECURITY TEST — Business Logic Abuse
 * ══════════════════════════════════════════════════════════════════
 * CSO threat model: price manipulation, negative quantity tricks,
 * stock race condition, payment bypass, commission rate tampering,
 * coupon/discount replay, pre-order limit bypass.
 *
 * OWASP: A04 Insecure Design
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CartService } from '../cart/cart.service';
import { OrderService } from '../order/order.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CartService as CartSvc } from '../cart/cart.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { QueueService } from '../queue/queue.service';
import { PushService } from '../push/push.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '@prisma/client';

// ─── Redis mock ───────────────────────────────────────────────────────────────

const cartStore: Record<string, string> = {};

jest.mock('ioredis', () => {
  const ctor: any = jest.fn().mockImplementation(() => ({
    get: jest.fn(async (k: string) => cartStore[k] ?? null),
    set: jest.fn(async (k: string, v: string) => { cartStore[k] = v; return 'OK'; }),
    del: jest.fn(async (k: string) => { delete cartStore[k]; return 1; }),
  }));
  ctor.default = ctor;
  return ctor;
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID   = 'user-biz-001';
const VARIANT_ID = 'var-biz-001';

function makeVariant(overrides: any = {}) {
  return {
    id:          overrides.id ?? VARIANT_ID,
    sku:         'SKU-BIZ',
    stockQty:    overrides.stockQty ?? 10,
    priceOverride: overrides.priceOverride ?? null,
    attributes:  {},
    product: {
      id:     'prod-biz-001',
      title:  'Test Product',
      images: [],
      price:  overrides.price ?? 99.99,
      status: overrides.status ?? 'LIVE',
      tenantId: 'tenant-biz-001',
      tenant: { displayName: 'Test Store', status: 'ACTIVE' },
    },
  };
}

function makeCartPrisma(variantOverride: any = {}) {
  const v = makeVariant(variantOverride);
  return {
    productVariant: {
      findUnique: jest.fn().mockResolvedValue(v),
      findMany:   jest.fn().mockResolvedValue([v]),
    },
  } as unknown as PrismaService;
}

function makeOrder(overrides: any = {}) {
  return {
    id:         overrides.id ?? 'order-biz-001',
    customerId: overrides.customerId ?? USER_ID,
    status:     overrides.status ?? 'PAID',
    totalPrice: overrides.totalPrice ?? 100,
    items: overrides.items ?? [
      {
        id: 'item-001',
        tenantId: 'tenant-biz-001',
        variantId: VARIANT_ID,
        qty: 1,
        price: 99.99,
        isPreOrder: false,
        variant: {
          id: VARIANT_ID,
          sku: 'SKU-BIZ',
          product: { id: 'prod-biz-001', title: 'Test', tenantId: 'tenant-biz-001', images: [] },
        },
      },
    ],
    shipments: [],
    customer: { id: USER_ID, email: 'user@example.com', name: 'User' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeOrderPrisma(orderOverride?: any) {
  const order = orderOverride === undefined ? makeOrder() : orderOverride;
  return {
    order: {
      findUnique: jest.fn().mockResolvedValue(order),
      findMany:   jest.fn().mockResolvedValue(order ? [order] : []),
      count:      jest.fn().mockResolvedValue(order ? 1 : 0),
      update:     jest.fn().mockResolvedValue(order),
    },
    orderItem: {
      findMany: jest.fn().mockResolvedValue(order?.items ?? []),
    },
    productVariant: {
      findMany:   jest.fn().mockResolvedValue([makeVariant()]),
      findUnique: jest.fn().mockResolvedValue(makeVariant()),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: USER_ID, email: 'user@example.com', name: 'User' }),
    },
    $transaction: jest.fn().mockImplementation((cb: any) => cb({
      order:          { update: jest.fn().mockResolvedValue(makeOrder()) },
      orderItem:      { findMany: jest.fn().mockResolvedValue([]) },
      productVariant: { update: jest.fn() },
      auditLog:       { create: jest.fn() },
    })),
  } as unknown as PrismaService;
}

const mockMail   = { sendOrderConfirmation: jest.fn(), sendOrderStatusUpdate: jest.fn() } as unknown as MailService;
const mockAudit  = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
const mockQueue2 = { sendMail: jest.fn() } as unknown as QueueService;
const mockPush2  = { sendToUsers: jest.fn() } as unknown as PushService;
const mockNotifs2 = { createNotification: jest.fn() } as unknown as NotificationsService;

async function buildCart(variantOverride: any = {}): Promise<CartService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CartService,
      { provide: PrismaService, useValue: makeCartPrisma(variantOverride) },
      { provide: ConfigService, useValue: { get: jest.fn(() => '') } as any },
    ],
  }).compile();
  return module.get<CartService>(CartService);
}

async function buildOrder(orderOverride?: any): Promise<OrderService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      OrderService,
      { provide: PrismaService,        useValue: makeOrderPrisma(orderOverride) },
      { provide: CartSvc,              useValue: { getRawEntries: jest.fn().mockResolvedValue([]), clearCart: jest.fn() } },
      { provide: AuditService,         useValue: mockAudit },
      { provide: QueueService,         useValue: mockQueue2 },
      { provide: MailService,          useValue: mockMail },
      { provide: PushService,          useValue: mockPush2 },
      { provide: NotificationsService, useValue: mockNotifs2 },
    ],
  }).compile();
  return module.get<OrderService>(OrderService);
}

beforeEach(() => {
  Object.keys(cartStore).forEach(k => delete cartStore[k]);
  jest.clearAllMocks();
});

// ─── SEC-BIZ-01: Price Manipulation ──────────────────────────────────────────

describe('[SEC-BIZ-01] Price Manipulation Prevention', () => {
  it('lineTotal is always calculated server-side from DB price (never client price)', async () => {
    const svc = await buildCart();
    cartStore[`cart:${USER_ID}`] = JSON.stringify([{ variantId: VARIANT_ID, qty: 2 }]);
    const result = await svc.getCart(USER_ID);
    // Price must come from DB (99.99), not from any client-submitted value
    expect(result[0].lineTotal).toBe(99.99 * 2);
  });

  it('priceOverride from DB is used when set (not client-supplied)', async () => {
    cartStore[`cart:${USER_ID}`] = JSON.stringify([{ variantId: VARIANT_ID, qty: 1 }]);
    const svc = await buildCart({ priceOverride: 49.99 });
    const result = await svc.getCart(USER_ID);
    expect(result[0].lineTotal).toBe(49.99);
  });

  it('negative quantity is rejected by addItem', async () => {
    const svc = await buildCart();
    await expect(svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: -1 }))
      .rejects.toThrow(BadRequestException);
  });

  it('zero quantity in addItem is rejected', async () => {
    const svc = await buildCart();
    await expect(svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 0 }))
      .rejects.toThrow(BadRequestException);
  });
});

// ─── SEC-BIZ-02: Stock Over-Purchase ─────────────────────────────────────────

describe('[SEC-BIZ-02] Stock Over-Purchase (Race Condition Mitigation)', () => {
  it('cannot exceed stock in a single addItem call', async () => {
    const svc = await buildCart({ stockQty: 5 });
    await expect(svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 6 }))
      .rejects.toThrow(BadRequestException);
  });

  it('accumulated quantity cannot exceed stock across multiple addItem calls', async () => {
    const svc = await buildCart({ stockQty: 5 });
    await svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 3 });
    await expect(svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 3 }))
      .rejects.toThrow(BadRequestException);
  });

  it('updateItem to a qty exceeding stock is rejected', async () => {
    cartStore[`cart:${USER_ID}`] = JSON.stringify([{ variantId: VARIANT_ID, qty: 1 }]);
    const svc = await buildCart({ stockQty: 3 });
    await expect(svc.updateItem(USER_ID, VARIANT_ID, { qty: 999 }))
      .rejects.toThrow(BadRequestException);
  });

  it('exactly-stock quantity is allowed (boundary value)', async () => {
    const svc = await buildCart({ stockQty: 5 });
    const result = await svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 5 });
    expect(result[0].qty).toBe(5);
  });
});

// ─── SEC-BIZ-03: Payment Bypass ───────────────────────────────────────────────

describe('[SEC-BIZ-03] Payment State Machine Integrity', () => {
  it('PENDING order cannot be directly set to DELIVERED (skip payment)', async () => {
    const pendingOrder = makeOrder({ status: 'PENDING' });
    const svc = await buildOrder(pendingOrder);
    const vendorActor = { id: 'vendor', role: UserRole.VENDOR_OWNER, tenantId: 'tenant-biz-001' };
    // VENDOR_TRANSITIONS from PENDING does not include DELIVERED
    await expect(svc.updateStatusAsVendor('order-biz-001', { status: 'DELIVERED' as any }, vendorActor))
      .rejects.toThrow();
  });

  it('CANCELLED order cannot be reopened to PAID', async () => {
    const cancelledOrder = makeOrder({ status: 'CANCELLED' });
    const svc = await buildOrder(cancelledOrder);
    const vendorActor = { id: 'vendor', role: UserRole.VENDOR_OWNER, tenantId: 'tenant-biz-001' };
    await expect(svc.updateStatusAsVendor('order-biz-001', { status: 'PAID' as any }, vendorActor))
      .rejects.toThrow();
  });

  it('SHIPPED order cannot be cancelled by customer', async () => {
    const shippedOrder = makeOrder({ status: 'SHIPPED' });
    const svc = await buildOrder(shippedOrder);
    await expect(svc.cancelOrder('order-biz-001', USER_ID))
      .rejects.toThrow(BadRequestException);
  });
});

// ─── SEC-BIZ-04: Cart Poisoning Prevention ───────────────────────────────────

describe('[SEC-BIZ-04] Cart Poisoning (Unavailable Products)', () => {
  it('cannot add DRAFT product to cart', async () => {
    const svc = await buildCart({ status: 'DRAFT' });
    await expect(svc.addItem(USER_ID, { variantId: VARIANT_ID, qty: 1 }))
      .rejects.toThrow(BadRequestException);
  });

  it('cannot add product from SUSPENDED store to cart (structural + service check)', () => {
    // Structural: verify the guard exists in source code
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../cart/cart.service.ts'), 'utf8',
    );
    // Cart service must check tenant.status before allowing add
    expect(src).toContain("tenant.status !== 'ACTIVE'");
    expect(src).toMatch(/BadRequestException.*Store is not active|Store is not active.*BadRequestException/s);
  });

  it('cannot add non-existent variant to cart', async () => {
    const prisma = makeCartPrisma();
    (prisma.productVariant.findUnique as jest.Mock).mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn(() => '') } as any },
      ],
    }).compile();
    const svc = module.get<CartService>(CartService);
    await expect(svc.addItem(USER_ID, { variantId: 'GHOST', qty: 1 }))
      .rejects.toThrow();
  });
});

// ─── SEC-BIZ-05: Pre-Order Cancellation Guards ────────────────────────────────

describe('[SEC-BIZ-05] Pre-Order Cancellation State Guards', () => {
  it('cannot cancel a pre-order that is already CANCELLED', async () => {
    const order = makeOrder({ status: 'CANCELLED' });
    order.items[0].isPreOrder = true;
    const svc = await buildOrder(order);
    await expect(svc.cancelPreOrder('order-biz-001', USER_ID))
      .rejects.toThrow(BadRequestException);
  });

  it('cannot cancel a pre-order after SHIPPED', async () => {
    const order = makeOrder({ status: 'SHIPPED' });
    order.items[0].isPreOrder = true;
    const svc = await buildOrder(order);
    await expect(svc.cancelPreOrder('order-biz-001', USER_ID))
      .rejects.toThrow(BadRequestException);
  });

  it('cannot cancel an order that has no pre-order items', async () => {
    const order = makeOrder({ status: 'PENDING' });
    order.items[0].isPreOrder = false; // Regular item, not pre-order
    const svc = await buildOrder(order);
    await expect(svc.cancelPreOrder('order-biz-001', USER_ID))
      .rejects.toThrow(BadRequestException);
  });
});

// ─── SEC-BIZ-06: Multi-Cart User Isolation ───────────────────────────────────

describe('[SEC-BIZ-06] Cart User Isolation', () => {
  it('user A cannot clear user B\'s cart via clearCart', async () => {
    const USER_B = 'user-biz-002';
    cartStore[`cart:${USER_B}`] = JSON.stringify([{ variantId: VARIANT_ID, qty: 1 }]);
    const svc = await buildCart();
    // clearCart takes userId as argument — calling with USER_ID only clears USER_ID's cart
    await svc.clearCart(USER_ID);
    // USER_B's cart should still exist
    expect(cartStore[`cart:${USER_B}`]).toBeDefined();
  });

  it('each user has isolated cart key namespace', async () => {
    const svc = await buildCart();
    await svc.addItem('user-alpha', { variantId: VARIANT_ID, qty: 1 });
    await svc.addItem('user-beta',  { variantId: VARIANT_ID, qty: 2 });
    const alphaCart = await svc.getCart('user-alpha');
    const betaCart  = await svc.getCart('user-beta');
    expect(alphaCart[0].qty).toBe(1);
    expect(betaCart[0].qty).toBe(2);
  });
});
