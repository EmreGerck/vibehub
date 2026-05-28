/**
 * adminUpdateProduct — security + integrity pins
 * ────────────────────────────────────────────────
 * These guard the highest-leverage money-safety behaviour in Sprint 13:
 *
 *   (a) only GOD_USER can flip a product's fulfilment / mfg unit / profit %;
 *   (b) even GOD_USER can't flip them once an OrderItem exists for the product
 *       (the snapshots would diverge from new orders);
 *   (c) flipping VIBEHUB_MANAGED → VENDOR_MANAGED force-clears the lane-1
 *       fields so reports don't carry stale data.
 *
 * If any of these regress, an attacker (or a clumsy admin) can silently
 * misroute artist profit — pin them.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdminService } from '../admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { VendorService } from '../../vendor/vendor.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { MailService } from '../../mail/mail.service';
import { SeoService } from '../../seo/seo.service';

const PRODUCT_ID = 'prod-1';
const ADMIN_ID   = 'admin-1';
const GOD_ID     = 'god-1';

function makeProduct(overrides: any = {}) {
  return {
    id: PRODUCT_ID,
    tenantId: 'tenant-1',
    title: 'Test merch',
    fulfilment: 'VENDOR_MANAGED',
    manufacturingUnitId: null,
    profitSharePct: null,
    ...overrides,
  };
}

function makePrisma(overrides: { product?: any; orderItemCount?: number } = {}) {
  const product = overrides.product ?? makeProduct();
  const orderItemCount = overrides.orderItemCount ?? 0;
  const txProductUpdate = jest.fn().mockImplementation(async ({ data }) => ({ ...product, ...data, variants: [], tenant: { id: product.tenantId, slug: 't', displayName: 'T' } }));
  return {
    product: {
      findUnique: jest.fn().mockResolvedValue(product),
    },
    orderItem: {
      count: jest.fn().mockResolvedValue(orderItemCount),
    },
    $transaction: jest.fn().mockImplementation(async (fn: any) =>
      fn({
        orderItem: { count: jest.fn().mockResolvedValue(orderItemCount) },
        product: { update: txProductUpdate },
      }),
    ),
    // expose the spy so tests can assert
    __txProductUpdate: txProductUpdate,
  } as any;
}

async function buildService(prisma: any): Promise<AdminService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AdminService,
      { provide: PrismaService,      useValue: prisma },
      { provide: AuditService,       useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      { provide: VendorService,      useValue: {} },
      { provide: PermissionsService, useValue: {} },
      { provide: MailService,        useValue: {} },
      { provide: SeoService,         useValue: {} },
    ],
  }).compile();
  return module.get<AdminService>(AdminService);
}

beforeEach(() => jest.clearAllMocks());

describe('AdminService.adminUpdateProduct — Sprint 13 audit pins', () => {

  it('blocks PLATFORM_ADMIN from setting fulfilment', async () => {
    const prisma = makePrisma();
    const svc = await buildService(prisma);
    await expect(
      svc.adminUpdateProduct(PRODUCT_ID, { fulfilment: 'VIBEHUB_MANAGED' as any }, ADMIN_ID, 'PLATFORM_ADMIN'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks PLATFORM_ADMIN from setting profitSharePct', async () => {
    const prisma = makePrisma();
    const svc = await buildService(prisma);
    await expect(
      svc.adminUpdateProduct(PRODUCT_ID, { profitSharePct: 0.9 as any }, ADMIN_ID, 'PLATFORM_ADMIN'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks PLATFORM_ADMIN from setting manufacturingUnitId', async () => {
    const prisma = makePrisma();
    const svc = await buildService(prisma);
    await expect(
      svc.adminUpdateProduct(PRODUCT_ID, { manufacturingUnitId: 'unit-1' as any }, ADMIN_ID, 'PLATFORM_ADMIN'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows GOD_USER to flip a product with no existing orders to VIBEHUB_MANAGED', async () => {
    const prisma = makePrisma();
    const svc = await buildService(prisma);
    const updated = await svc.adminUpdateProduct(
      PRODUCT_ID,
      { fulfilment: 'VIBEHUB_MANAGED' as any, manufacturingUnitId: 'unit-1', profitSharePct: 0.5 },
      GOD_ID,
      'GOD_USER',
    );
    expect(updated.fulfilment).toBe('VIBEHUB_MANAGED');
    expect(prisma.__txProductUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ fulfilment: 'VIBEHUB_MANAGED', manufacturingUnitId: 'unit-1', profitSharePct: 0.5 }) }),
    );
  });

  it('blocks GOD_USER from flipping fulfilment after first order (lock-after-first-order)', async () => {
    // Critical money-safety pin: snapshots from past orders use the old
    // fulfilment; flipping it now would diverge stored vendorPayoutAmount
    // from any future order's snapshot.
    const prisma = makePrisma({ orderItemCount: 1 });
    const svc = await buildService(prisma);
    await expect(
      svc.adminUpdateProduct(PRODUCT_ID, { fulfilment: 'VIBEHUB_MANAGED' as any }, GOD_ID, 'GOD_USER'),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks GOD_USER from changing profitSharePct after first order', async () => {
    const prisma = makePrisma({
      product: makeProduct({ fulfilment: 'VIBEHUB_MANAGED', profitSharePct: 0.5 }),
      orderItemCount: 1,
    });
    const svc = await buildService(prisma);
    await expect(
      svc.adminUpdateProduct(PRODUCT_ID, { profitSharePct: 0.7 }, GOD_ID, 'GOD_USER'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects mfg/profit fields when effective fulfilment = VENDOR_MANAGED', async () => {
    const prisma = makePrisma();
    const svc = await buildService(prisma);
    await expect(
      svc.adminUpdateProduct(PRODUCT_ID, { manufacturingUnitId: 'unit-1' }, GOD_ID, 'GOD_USER'),
    ).rejects.toThrow(BadRequestException);
  });

  it('force-clears lane-1 fields when flipping VIBEHUB_MANAGED → VENDOR_MANAGED', async () => {
    const prisma = makePrisma({
      product: makeProduct({ fulfilment: 'VIBEHUB_MANAGED', manufacturingUnitId: 'unit-1', profitSharePct: 0.5 }),
      // No orders yet — the flip is allowed.
    });
    const svc = await buildService(prisma);
    await svc.adminUpdateProduct(PRODUCT_ID, { fulfilment: 'VENDOR_MANAGED' as any }, GOD_ID, 'GOD_USER');
    // The update payload should null out both lane-1 columns even though
    // the DTO didn't ask — otherwise reports show stale data.
    expect(prisma.__txProductUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fulfilment: 'VENDOR_MANAGED',
          manufacturingUnitId: null,
          profitSharePct: null,
        }),
      }),
    );
  });

  it('allows GOD_USER to edit non-lane-1 fields (title/price) without role check tripping', async () => {
    const prisma = makePrisma();
    const svc = await buildService(prisma);
    const updated = await svc.adminUpdateProduct(
      PRODUCT_ID,
      { title: 'New title', price: 100 },
      GOD_ID,
      'GOD_USER',
    );
    expect(updated.title).toBe('New title');
  });

  it('allows PLATFORM_ADMIN to edit non-lane-1 fields (title/price) — only lane-1 fields are GOD-gated', async () => {
    const prisma = makePrisma();
    const svc = await buildService(prisma);
    const updated = await svc.adminUpdateProduct(
      PRODUCT_ID,
      { title: 'New title' },
      ADMIN_ID,
      'PLATFORM_ADMIN',
    );
    expect(updated.title).toBe('New title');
  });
});
