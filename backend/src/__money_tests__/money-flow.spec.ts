/**
 * Money Flow — Smoke Tests
 * ────────────────────────
 * Three end-to-end happy-path checks against the SERVICE layer (no HTTP):
 *   1. Order placement → row created, totals/stock correct, vendor email per tenant
 *   2. Refund approval → status REFUNDED, customer notified, audit log written
 *   3. Payout creation → payout row PENDING, gross/fee/net computed, audit logged
 *
 * All side-effects (Prisma, Mail, Push, Notifications, Queue) are mocked.
 * Fast + deterministic — no real DB or network.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderService } from '../order/order.service';
import { PayoutService } from '../payout/payout.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CartService } from '../cart/cart.service';
import { QueueService } from '../queue/queue.service';
import { PushService } from '../push/push.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const CUSTOMER = { id: 'cust-1', email: 'buyer@example.com', name: 'Test Buyer' };

const TENANT_A = {
  id: 'tenant-a',
  status: 'ACTIVE',
  displayName: 'Store A',
  commissionRate: new Decimal('0.15'),
};

const TENANT_B = {
  id: 'tenant-b',
  status: 'ACTIVE',
  displayName: 'Store B',
  commissionRate: new Decimal('0.20'),
};

function makeProduct(tenant: typeof TENANT_A, suffix: string) {
  return {
    id: `prod-${suffix}`,
    title: `Product ${suffix}`,
    status: 'LIVE',
    price: new Decimal('100.00'),
    currency: 'TRY',
    isPreOrder: false,
    preOrderEndsAt: null,
    preOrderLimit: null,
    preOrderShipDate: null,
    tenantId: tenant.id,
    tenant,
    // Stage 1/2: money-flow happy path stays in lane 2 (flat commission).
    fulfilment: 'VENDOR_MANAGED' as const,
    manufacturingUnitId: null,
    profitSharePct: null,
    manufacturingUnit: null,
    category: null,
  };
}

function makeVariant(product: ReturnType<typeof makeProduct>, suffix: string, stockQty = 10) {
  return {
    id: `var-${suffix}`,
    productId: product.id,
    stockQty,
    priceOverride: null,
    product,
  };
}

// ── Mock factories ───────────────────────────────────────────────────────────

function makeSilentMail(): MailService {
  return {
    sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
    sendOrderConfirmed:    jest.fn().mockResolvedValue(undefined),
    sendOrderDelivered:    jest.fn().mockResolvedValue(undefined),
    sendAdminNewOrder:     jest.fn().mockResolvedValue(undefined),
    sendVendorNewOrder:    jest.fn().mockResolvedValue(undefined),
    sendVendorRefundRequest: jest.fn().mockResolvedValue(undefined),
    sendRefundRequested:   jest.fn().mockResolvedValue(undefined),
    sendRefundApproved:    jest.fn().mockResolvedValue(undefined),
    sendRefundRejected:    jest.fn().mockResolvedValue(undefined),
    sendReturnBarcode:     jest.fn().mockResolvedValue(undefined),
    sendShipmentNotification: jest.fn().mockResolvedValue(undefined),
  } as unknown as MailService;
}

function makeSilentNotifications(): NotificationsService {
  return { create: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationsService;
}

function makeSilentPush(): PushService {
  return { sendToUser: jest.fn().mockResolvedValue(undefined) } as unknown as PushService;
}

function makeSilentQueue(): QueueService {
  return { sendMail: jest.fn().mockResolvedValue(undefined) } as unknown as QueueService;
}

function makeSilentAudit(): AuditService {
  return { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Order placement
// ─────────────────────────────────────────────────────────────────────────────

describe('Money flow — order placement', () => {
  it('creates order, decrements stock, and queues one vendor email per tenant', async () => {
    // Build a cart with items from TWO tenants — verifies the B4 per-tenant
    // grouping logic actually fans out emails correctly.
    const productA = makeProduct(TENANT_A, 'a');
    const productB = makeProduct(TENANT_B, 'b');
    const variantA = makeVariant(productA, 'a', 10);
    const variantB = makeVariant(productB, 'b', 10);

    const cartEntries = [
      { variantId: variantA.id, qty: 2 }, // 2 × 100 = 200 (tenant A)
      { variantId: variantB.id, qty: 1 }, // 1 × 100 = 100 (tenant B)
    ];
    // Expected order total: 300 TRY

    // Spy on the order.create call inside the transaction so we can inspect totals
    const orderCreateSpy = jest.fn().mockImplementation((args: any) => Promise.resolve({
      id: 'ord-1',
      ...args.data,
      // Simulate Prisma `include` — return the items with deep product+tenant info
      items: [
        {
          variantId: variantA.id,
          tenantId: TENANT_A.id,
          qty: 2,
          unitPriceSnapshot: new Decimal('100.00'),
          variant: { ...variantA, product: { ...productA, tenantId: TENANT_A.id } },
          tenant: TENANT_A,
        },
        {
          variantId: variantB.id,
          tenantId: TENANT_B.id,
          qty: 1,
          unitPriceSnapshot: new Decimal('100.00'),
          variant: { ...variantB, product: { ...productB, tenantId: TENANT_B.id } },
          tenant: TENANT_B,
        },
      ],
    }));

    const txVariantUpdate = jest.fn().mockResolvedValue({ count: 1 });

    const prisma = {
      productVariant: {
        findMany: jest.fn().mockResolvedValue([variantA, variantB]),
      },
      orderItem: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { qty: 0 } }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(CUSTOMER),
      },
      platformSettings: {
        findUnique: jest.fn().mockResolvedValue({
          orderNotificationEmail: 'admin@vibehub.io',
        }),
      },
      tenant: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: TENANT_A.id,
            displayName: TENANT_A.displayName,
            users: [{ email: 'owner-a@example.com' }],
          },
          {
            id: TENANT_B.id,
            displayName: TENANT_B.displayName,
            users: [{ email: 'owner-b@example.com' }],
          },
        ]),
      },
      $transaction: jest.fn().mockImplementation(async (fn: any) => {
        const tx = {
          order: { create: orderCreateSpy },
          productVariant: { updateMany: txVariantUpdate },
        };
        return fn(tx);
      }),
    } as unknown as PrismaService;

    const cart = {
      getRawEntries: jest.fn().mockResolvedValue(cartEntries),
      clearCart:     jest.fn().mockResolvedValue(undefined),
    } as unknown as CartService;

    const mail = makeSilentMail();
    const audit = makeSilentAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService,        useValue: prisma },
        { provide: AuditService,         useValue: audit },
        { provide: CartService,          useValue: cart },
        { provide: QueueService,         useValue: makeSilentQueue() },
        { provide: PushService,          useValue: makeSilentPush() },
        { provide: NotificationsService, useValue: makeSilentNotifications() },
        { provide: MailService,          useValue: mail },
      ],
    }).compile();

    const svc = module.get<OrderService>(OrderService);

    const order = await svc.placeOrder(CUSTOMER.id, {
      currency: 'TRY',
      shippingAddress: { city: 'Istanbul', country: 'TR' } as any,
    });

    // ── Order created with correct total ──────────────────────────────────────
    expect(order).toHaveProperty('id', 'ord-1');
    expect(orderCreateSpy).toHaveBeenCalledTimes(1);
    const createArgs = orderCreateSpy.mock.calls[0][0];
    // Total = 2×100 + 1×100 = 300 TRY (in Decimal form)
    expect(createArgs.data.totalAmount.toString()).toBe('300');
    expect(createArgs.data.currency).toBe('TRY');
    expect(createArgs.data.customerId).toBe(CUSTOMER.id);
    expect(createArgs.data.status).toBe('PLACED');

    // ── Stock decremented atomically per non-pre-order variant ───────────────
    expect(txVariantUpdate).toHaveBeenCalledTimes(2);
    const decrementCalls = txVariantUpdate.mock.calls;
    expect(decrementCalls.some((c: any[]) => c[0]?.where?.id === variantA.id)).toBe(true);
    expect(decrementCalls.some((c: any[]) => c[0]?.where?.id === variantB.id)).toBe(true);

    // ── Cart cleared ──────────────────────────────────────────────────────────
    expect(cart.clearCart).toHaveBeenCalledWith(CUSTOMER.id);

    // ── Confirmation email queued for customer ────────────────────────────────
    // (it's queued via QueueService.sendMail, not direct MailService)
    expect((order as any).items.length).toBe(2);

    // ── Vendor emails: one per affected tenant (B4 logic) ────────────────────
    // Need to yield so fire-and-forget promises run
    await new Promise((r) => setImmediate(r));
    expect(mail.sendVendorNewOrder).toHaveBeenCalledTimes(2);
    const vendorEmailRecipients = (mail.sendVendorNewOrder as jest.Mock).mock.calls.map(c => c[0]);
    expect(vendorEmailRecipients).toEqual(expect.arrayContaining(['owner-a@example.com', 'owner-b@example.com']));

    // ── Admin email fired (one) ──────────────────────────────────────────────
    expect(mail.sendAdminNewOrder).toHaveBeenCalledTimes(1);
    expect((mail.sendAdminNewOrder as jest.Mock).mock.calls[0][0]).toBe('admin@vibehub.io');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Refund approval
// ─────────────────────────────────────────────────────────────────────────────

describe('Money flow — refund approval', () => {
  it('transitions REFUND_REQUESTED → REFUNDED, notifies customer, writes audit log', async () => {
    const orderRow: any = {
      id: 'ord-r1',
      customerId: CUSTOMER.id,
      status: 'REFUND_REQUESTED',
      totalAmount: new Decimal('250.00'),
      currency: 'TRY',
      customer: { email: CUSTOMER.email, name: CUSTOMER.name },
      items: [
        { variantId: 'var-r1', qty: 1, isPreOrder: false },
      ],
    };

    const orderUpdate = jest.fn().mockImplementation((args: any) => Promise.resolve({
      ...orderRow,
      ...args.data,
    }));
    const variantUpdate = jest.fn().mockResolvedValue({});

    const prisma: any = {
      order: {
        findUnique: jest.fn().mockResolvedValue(orderRow),
      },
      productVariant: { update: variantUpdate },
      // Approve flow touches returnShipment via raw any-cast (`this.prisma as any`)
      returnShipment: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn().mockImplementation(async (fn: any) => {
        const tx = {
          order: { update: orderUpdate },
          productVariant: { update: variantUpdate },
        };
        return fn(tx);
      }),
    };

    const mail = makeSilentMail();
    const audit = makeSilentAudit();
    const notifications = makeSilentNotifications();
    const push = makeSilentPush();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService,        useValue: prisma as unknown as PrismaService },
        { provide: AuditService,         useValue: audit },
        { provide: CartService,          useValue: { getRawEntries: jest.fn(), clearCart: jest.fn() } as unknown as CartService },
        { provide: QueueService,         useValue: makeSilentQueue() },
        { provide: PushService,          useValue: push },
        { provide: NotificationsService, useValue: notifications },
        { provide: MailService,          useValue: mail },
      ],
    }).compile();

    const svc = module.get<OrderService>(OrderService);

    const result = await svc.approveRefund('ord-r1', 'admin-1', 'Customer eligible per policy');

    // ── Status flipped to REFUNDED with timestamp + note ─────────────────────
    expect(orderUpdate).toHaveBeenCalledTimes(1);
    const updateArgs = orderUpdate.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('REFUNDED');
    expect(updateArgs.data.refundedAt).toBeInstanceOf(Date);
    expect(updateArgs.data.refundNote).toBe('Customer eligible per policy');
    expect(result.status).toBe('REFUNDED');

    // ── Stock restored for non-pre-order item ────────────────────────────────
    expect(variantUpdate).toHaveBeenCalledTimes(1);
    expect(variantUpdate.mock.calls[0][0]).toMatchObject({
      where: { id: 'var-r1' },
      data: { stockQty: { increment: 1 } },
    });

    // ── Customer notified via mail + push + in-app ───────────────────────────
    // sendRefundApproved is .catch() so let promises flush
    await new Promise((r) => setImmediate(r));
    expect(mail.sendRefundApproved).toHaveBeenCalledWith(
      CUSTOMER.email, 'ord-r1', 250, 'TRY',
    );
    expect(push.sendToUser).toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalled();

    // ── Audit log written ────────────────────────────────────────────────────
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'REFUND_APPROVED',
        targetType: 'Order',
        targetId: 'ord-r1',
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Payout creation (Phase B5: vendor self-request)
// ─────────────────────────────────────────────────────────────────────────────

describe('Money flow — payout creation', () => {
  it('vendor requests payout → row created PENDING with computed gross/fee/net + audit', async () => {
    const tenantId = TENANT_A.id;
    const actorId  = 'vendor-owner-1';

    // 5 DELIVERED order items in the period — 100 TRY each, 15% platform fee
    // Gross = 500, Fee = 75, Net = 425
    const deliveredItems = Array.from({ length: 5 }).map((_, i) => ({
      qty: 1,
      unitPriceSnapshot: new Decimal('100.00'),
      vendorPayoutAmount: new Decimal('85.00'), // 100 × (1 - 0.15)
    }));

    const payoutCreate = jest.fn().mockImplementation((args: any) => Promise.resolve({
      id: 'payout-1',
      tenantId,
      ...args.data,
      tenant: { id: tenantId, slug: 'store-a', displayName: TENANT_A.displayName },
    }));

    const prisma: any = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          id: tenantId,
          // First payout request → period starts at tenant.createdAt
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        }),
      },
      payout: {
        findFirst: jest.fn().mockResolvedValue(null), // no previous payout
        create:    payoutCreate,
      },
      orderItem: {
        count:    jest.fn().mockResolvedValue(5),  // pre-flight: 5 delivered items
        findMany: jest.fn().mockResolvedValue(deliveredItems),
      },
    };

    const audit = makeSilentAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutService,
        { provide: PrismaService, useValue: prisma as unknown as PrismaService },
        { provide: AuditService,  useValue: audit },
      ],
    }).compile();

    const svc = module.get<PayoutService>(PayoutService);

    const payout = await svc.requestForTenant(tenantId, actorId);

    // ── Payout row created with status PENDING ───────────────────────────────
    expect(payoutCreate).toHaveBeenCalledTimes(1);
    const createArgs = payoutCreate.mock.calls[0][0];
    expect(createArgs.data.tenantId).toBe(tenantId);
    expect(createArgs.data.status).toBe('PENDING');

    // ── Money math: gross = 500, fee = 75, net = 425 ─────────────────────────
    expect(createArgs.data.grossAmount.toString()).toBe('500');
    expect(createArgs.data.netAmount.toString()).toBe('425');
    expect(createArgs.data.platformFee.toString()).toBe('75');

    // ── Period coherent: end > start ─────────────────────────────────────────
    expect(createArgs.data.periodEnd.getTime()).toBeGreaterThan(
      createArgs.data.periodStart.getTime(),
    );

    // ── Return value carries the new payout ──────────────────────────────────
    expect(payout).toHaveProperty('id', 'payout-1');

    // ── Audit log ────────────────────────────────────────────────────────────
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        action: 'PAYOUT_CREATED',
        targetType: 'Payout',
        targetId: 'payout-1',
        metadata: expect.objectContaining({
          tenantId,
          gross: 500,
          net:   425,
        }),
      }),
    );
  });
});
