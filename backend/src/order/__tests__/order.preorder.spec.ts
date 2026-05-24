/**
 * OrderService — Pre-order Cancel + Edge Case Tests
 * ──────────────────────────────────────────────────
 * Covers: cancelPreOrder (happy path, wrong user, no pre-order items,
 *         already shipped, already cancelled), audit log, stock restore
 *         for mixed orders (regular + pre-order items).
 *
 * Also covers cancelOrder branches not in main spec:
 *   already-terminal status, non-existent order, wrong customer.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { OrderService } from '../order.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { QueueService } from '../../queue/queue.service';
import { CartService } from '../../cart/cart.service';
import { PushService } from '../../push/push.service';
import { NotificationsService } from '../../notifications/notifications.service';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const ORDER_ID     = 'order-preorder-1';
const CUSTOMER_ID  = 'customer-1';
const VARIANT_ID   = 'var-1';
const VARIANT_ID2  = 'var-2';

function makeOrder(overrides: any = {}) {
  return {
    id:             ORDER_ID,
    customerId:     CUSTOMER_ID,
    status:         'PLACED',
    totalAmount:    200,
    currency:       'TRY',
    shippingAddress: {},
    items: overrides.items ?? [
      {
        id:        'item-1',
        variantId: VARIANT_ID,
        qty:       2,
        isPreOrder: overrides.allPreOrder ?? true,
        variant:   { product: { title: 'Pre-order Product' } },
      },
    ],
    ...overrides,
  };
}

function makeMixedOrder() {
  return {
    id:         ORDER_ID,
    customerId: CUSTOMER_ID,
    status:     'PLACED',
    totalAmount: 300,
    currency:   'TRY',
    shippingAddress: {},
    items: [
      { id: 'item-pre', variantId: VARIANT_ID,  qty: 1, isPreOrder: true,  variant: { product: { title: 'Pre-order' } } },
      { id: 'item-reg', variantId: VARIANT_ID2, qty: 3, isPreOrder: false, variant: { product: { title: 'Regular' } } },
    ],
  };
}

function makePrisma(orderOverride?: any | null): PrismaService {
  const txUpdate  = jest.fn().mockResolvedValue({ id: ORDER_ID, status: 'CANCELLED' });
  const txVariant = jest.fn().mockResolvedValue({});
  // Use explicit sentinel: undefined = use default, null = return null (order not found)
  const orderValue = orderOverride === undefined ? makeOrder() : orderOverride;

  return {
    order: {
      findUnique: jest.fn().mockResolvedValue(orderValue),
      update:     jest.fn().mockResolvedValue({ id: ORDER_ID, status: 'CANCELLED' }),
      create:     jest.fn(),
      findMany:   jest.fn().mockResolvedValue([]),
      count:      jest.fn().mockResolvedValue(0),
    },
    productVariant: {
      findUnique: jest.fn().mockResolvedValue({ id: VARIANT_ID, stockQty: 10 }),
      update:     txVariant,
    },
    orderItem: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (fn) => {
      await fn({
        order:          { update: txUpdate },
        productVariant: { update: txVariant },
      });
    }),
  } as unknown as PrismaService;
}

const mockAudit   = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
const mockQueue   = { sendMail: jest.fn() } as unknown as QueueService;
const mockCart    = { getRawEntries: jest.fn().mockResolvedValue([]), clearCart: jest.fn() } as unknown as CartService;
const mockPush    = { sendToUsers: jest.fn() } as unknown as PushService;
const mockNotifs  = { createNotification: jest.fn() } as unknown as NotificationsService;

async function build(prismaOverride?: any): Promise<OrderService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      OrderService,
      { provide: PrismaService,        useValue: prismaOverride ?? makePrisma() },
      { provide: AuditService,         useValue: mockAudit },
      { provide: QueueService,         useValue: mockQueue },
      { provide: CartService,          useValue: mockCart },
      { provide: PushService,          useValue: mockPush },
      { provide: NotificationsService, useValue: mockNotifs },
    ],
  }).compile();
  return module.get<OrderService>(OrderService);
}

beforeEach(() => jest.clearAllMocks());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OrderService — cancelPreOrder()', () => {

  it('cancels a pre-order and logs audit', async () => {
    const svc = await build();
    const result = await svc.cancelPreOrder(ORDER_ID, CUSTOMER_ID);
    expect(result.status).toBe('CANCELLED');
    expect(result.preOrderItemsCancelled).toBe(1);
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PRE_ORDER_CANCELLED' }),
    );
  });

  it('throws NotFoundException when order does not exist', async () => {
    const svc = await build(makePrisma(null));
    await expect(svc.cancelPreOrder(ORDER_ID, CUSTOMER_ID)).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when customerId does not match', async () => {
    const svc = await build();
    await expect(svc.cancelPreOrder(ORDER_ID, 'wrong-customer'))
      .rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when order has no pre-order items', async () => {
    const order = makeOrder({ items: [{ id: 'item-1', variantId: VARIANT_ID, qty: 1, isPreOrder: false, variant: { product: { title: 'Regular' } } }] });
    const svc = await build(makePrisma(order));
    await expect(svc.cancelPreOrder(ORDER_ID, CUSTOMER_ID))
      .rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when order is already SHIPPED', async () => {
    const order = makeOrder({ status: 'SHIPPED' });
    const svc = await build(makePrisma(order));
    await expect(svc.cancelPreOrder(ORDER_ID, CUSTOMER_ID))
      .rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when order is already DELIVERED', async () => {
    const order = makeOrder({ status: 'DELIVERED' });
    const svc = await build(makePrisma(order));
    await expect(svc.cancelPreOrder(ORDER_ID, CUSTOMER_ID))
      .rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when order is already CANCELLED', async () => {
    const order = makeOrder({ status: 'CANCELLED' });
    const svc = await build(makePrisma(order));
    await expect(svc.cancelPreOrder(ORDER_ID, CUSTOMER_ID))
      .rejects.toThrow(BadRequestException);
  });

  it('allows cancel when order is CONFIRMED', async () => {
    const order = makeOrder({ status: 'CONFIRMED' });
    const svc = await build(makePrisma(order));
    const result = await svc.cancelPreOrder(ORDER_ID, CUSTOMER_ID);
    expect(result.status).toBe('CANCELLED');
  });

  it('restores stock for regular items in a mixed order', async () => {
    const prisma = makePrisma(makeMixedOrder());
    const txVariant = jest.fn().mockResolvedValue({});
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      await fn({
        order:          { update: jest.fn().mockResolvedValue({ id: ORDER_ID, status: 'CANCELLED' }) },
        productVariant: { update: txVariant },
      });
    });

    const svc = await build(prisma);
    await svc.cancelPreOrder(ORDER_ID, CUSTOMER_ID);

    // Should call update for regular item (qty 3) but NOT for pre-order item
    expect(txVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: VARIANT_ID2 },  // regular item
        data:  { stockQty: { increment: 3 } },
      }),
    );
    // Should NOT restore stock for pre-order item
    expect(txVariant).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VARIANT_ID } }),
    );
  });

  it('counts cancelled pre-order items correctly in mixed order', async () => {
    const svc = await build(makePrisma(makeMixedOrder()));
    const result = await svc.cancelPreOrder(ORDER_ID, CUSTOMER_ID);
    expect(result.preOrderItemsCancelled).toBe(1);
  });

  it('audit log includes product titles', async () => {
    const svc = await build();
    await svc.cancelPreOrder(ORDER_ID, CUSTOMER_ID);
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          products: expect.arrayContaining(['Pre-order Product']),
        }),
      }),
    );
  });
});

// ─── cancelOrder additional branches ─────────────────────────────────────────

describe('OrderService — cancelOrder() edge cases', () => {

  it('throws ForbiddenException when customerId mismatches', async () => {
    const svc = await build(makePrisma(makeOrder({ status: 'PLACED' })));
    await expect(svc.cancelOrder(ORDER_ID, 'wrong-id')).rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when order is SHIPPED (terminal-adjacent)', async () => {
    const svc = await build(makePrisma(makeOrder({ status: 'SHIPPED', allPreOrder: false })));
    await expect(svc.cancelOrder(ORDER_ID, CUSTOMER_ID)).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when order does not exist', async () => {
    const svc = await build(makePrisma(null));
    await expect(svc.cancelOrder(ORDER_ID, CUSTOMER_ID)).rejects.toThrow(NotFoundException);
  });

  it('cancels CONFIRMED order and returns CANCELLED status', async () => {
    const prisma = makePrisma(makeOrder({ status: 'CONFIRMED', items: [{ id: 'item-1', variantId: VARIANT_ID, qty: 1, isPreOrder: false }] }));
    const svc = await build(prisma);
    const result = await svc.cancelOrder(ORDER_ID, CUSTOMER_ID);
    expect(result.status).toBe('CANCELLED');
  });
});
