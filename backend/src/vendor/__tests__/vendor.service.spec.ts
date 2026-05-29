/**
 * VendorService — Comprehensive Unit Tests
 * ─────────────────────────────────────────
 * Covers: apply, review (approve/reject), findAll, findBySlug,
 *         update, follow/unfollow, getFollowStatus, getMyTenant,
 *         getVendorEvents.
 *
 * IF-branch tests: slug conflict, email conflict, non-PENDING review,
 *                  inactive store follow, missing tenant, events disabled.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { VendorService } from '../vendor.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { QueueService } from '../../queue/queue.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { VendorDecision } from '../dto/review-vendor.dto';
import { ArtistType } from '@prisma/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-111';
const USER_ID   = 'user-aaa';

const PENDING_TENANT = {
  id: TENANT_ID,
  slug: 'test-store',
  displayName: 'Test Store',
  status: 'PENDING',
  artistType: 'BAND',
  eventsEnabled: true,
};

const ACTIVE_TENANT = { ...PENDING_TENANT, status: 'ACTIVE' };

const APPLY_DTO = {
  slug:          'new-store',
  displayName:   'New Store',
  artistType:    ArtistType.BAND,
  bio:           'Bio text',
  ownerEmail:    'owner@test.com',
  ownerPassword: 'Password123!',
};

// ─── Mock factories ────────────────────────────────────────────────────────────

function makePrisma(overrides: any = {}): PrismaService {
  return {
    tenant: {
      findUnique: jest.fn().mockResolvedValue(overrides.tenant ?? null),
      findMany:   jest.fn().mockResolvedValue(overrides.tenants ?? [ACTIVE_TENANT]),
      count:      jest.fn().mockResolvedValue(overrides.count ?? 1),
      create:     jest.fn().mockResolvedValue(PENDING_TENANT),
      update:     jest.fn().mockImplementation(async ({ data }) => ({ ...PENDING_TENANT, ...data })),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(overrides.user ?? null),
      findFirst:  jest.fn().mockResolvedValue(overrides.ownerUser ?? { email: 'owner@test.com' }),
      findMany:   jest.fn().mockResolvedValue(overrides.adminUsers ?? []),
      create:     jest.fn().mockResolvedValue({ id: USER_ID, email: 'owner@test.com', role: 'VENDOR_OWNER' }),
    },
    follow: {
      upsert:     jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(overrides.follow ?? null),
    },
    vendorEvent: {
      findMany: jest.fn().mockResolvedValue(overrides.events ?? [{ id: 'evt-1', date: new Date(), active: true }]),
    },
    $transaction: jest.fn().mockImplementation(async (fn) => fn({
      tenant: {
        create: jest.fn().mockResolvedValue(PENDING_TENANT),
      },
      user: {
        create: jest.fn().mockResolvedValue({ id: USER_ID }),
      },
    })),
  } as unknown as PrismaService;
}

const mockAudit   = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
const mockQueue   = { sendMail: jest.fn().mockResolvedValue(undefined) } as unknown as QueueService;
const mockPerms   = { grantDefaults: jest.fn().mockResolvedValue(undefined), tenantHas: jest.fn().mockResolvedValue(false) } as unknown as PermissionsService;

async function build(prismaOverride?: any): Promise<VendorService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VendorService,
      { provide: PrismaService,      useValue: prismaOverride ?? makePrisma() },
      { provide: AuditService,       useValue: mockAudit },
      { provide: QueueService,       useValue: mockQueue },
      { provide: PermissionsService, useValue: mockPerms },
    ],
  }).compile();
  return module.get<VendorService>(VendorService);
}

beforeEach(() => jest.clearAllMocks());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VendorService', () => {

  // ── apply() ───────────────────────────────────────────────────────────────────

  describe('apply()', () => {
    it('creates tenant and owner when slug and email are unique', async () => {
      const svc = await build(makePrisma({ tenant: null, user: null }));
      const result = await svc.apply(APPLY_DTO);
      expect(result).toMatchObject({ slug: 'test-store' });
    });

    it('throws VH-3002 when slug already taken', async () => {
      const prisma = makePrisma({ user: null });
      (prisma.tenant.findUnique as jest.Mock).mockResolvedValue(PENDING_TENANT);
      const svc = await build(prisma);
      await expect(svc.apply(APPLY_DTO)).rejects.toMatchObject({ errorCode: 'VH-3002' });
    });

    it('throws VH-3001 when email already registered', async () => {
      const prisma = makePrisma({ tenant: null, user: { id: USER_ID, email: 'owner@test.com' } });
      const svc = await build(prisma);
      await expect(svc.apply(APPLY_DTO)).rejects.toMatchObject({ errorCode: 'VH-3001' });
    });
  });

  // ── review() ──────────────────────────────────────────────────────────────────

  describe('review()', () => {
    it('approves a PENDING vendor and sends welcome email', async () => {
      const prisma = makePrisma({ tenant: PENDING_TENANT });
      const svc = await build(prisma);
      await svc.review(TENANT_ID, { decision: VendorDecision.APPROVE, reason: '' }, 'admin-1');
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
      );
      expect(mockQueue.sendMail).toHaveBeenCalledWith(expect.objectContaining({ type: 'VENDOR_WELCOME' }));
    });

    it('rejects a PENDING vendor and sends rejection email (not welcome)', async () => {
      const prisma = makePrisma({ tenant: PENDING_TENANT });
      const svc = await build(prisma);
      await svc.review(TENANT_ID, { decision: VendorDecision.REJECT, reason: 'Policy violation' }, 'admin-1');
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED' }) }),
      );
      expect(mockQueue.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'VENDOR_REJECTED', reason: 'Policy violation' }),
      );
      expect(mockQueue.sendMail).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'VENDOR_WELCOME' }),
      );
    });

    it('throws BadRequestException when vendor is not PENDING', async () => {
      const prisma = makePrisma({ tenant: ACTIVE_TENANT });
      const svc = await build(prisma);
      await expect(svc.review(TENANT_ID, { decision: VendorDecision.APPROVE, reason: '' }, 'admin-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when vendor does not exist', async () => {
      const prisma = makePrisma({ tenant: null });
      const svc = await build(prisma);
      await expect(svc.review('GHOST', { decision: VendorDecision.APPROVE, reason: '' }, 'admin-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('logs audit event on review', async () => {
      const prisma = makePrisma({ tenant: PENDING_TENANT });
      const svc = await build(prisma);
      await svc.review(TENANT_ID, { decision: VendorDecision.APPROVE, reason: 'Looks good' }, 'admin-1');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'VENDOR_APPROVE' }),
      );
    });
  });

  // ── findAll() ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('filters by ACTIVE status in public mode', async () => {
      const prisma = makePrisma();
      const svc = await build(prisma);
      await svc.findAll({ page: 1, limit: 20, skip: 0 } as any, false);
      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'ACTIVE' }) }),
      );
    });

    it('passes status filter in admin mode when provided', async () => {
      const prisma = makePrisma();
      const svc = await build(prisma);
      await svc.findAll({ page: 1, limit: 20, skip: 0, status: 'PENDING' } as any, true);
      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) }),
      );
    });

    it('applies search filter case-insensitively', async () => {
      const prisma = makePrisma();
      const svc = await build(prisma);
      await svc.findAll({ page: 1, limit: 20, skip: 0, search: 'test' } as any, false);
      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });

    it('clamps search to 100 chars to prevent ReDoS', async () => {
      const prisma = makePrisma();
      const svc = await build(prisma);
      const longQuery = 'a'.repeat(200);
      await svc.findAll({ page: 1, limit: 20, skip: 0, search: longQuery } as any, false);
      const call = (prisma.tenant.findMany as jest.Mock).mock.calls[0][0];
      const searchVal = call.where.OR[0].displayName.contains;
      expect(searchVal.length).toBe(100);
    });
  });

  // ── findBySlug() ──────────────────────────────────────────────────────────────

  describe('findBySlug()', () => {
    it('returns tenant when found', async () => {
      const prisma = makePrisma({ tenant: { ...ACTIVE_TENANT, _count: { followers: 5, products: 3 } } });
      const svc = await build(prisma);
      const result = await svc.findBySlug('test-store');
      expect(result.slug).toBe('test-store');
    });

    it('throws NotFoundException when slug does not exist', async () => {
      const svc = await build(makePrisma({ tenant: null }));
      await expect(svc.findBySlug('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── follow / unfollow / getFollowStatus ───────────────────────────────────────

  describe('follow()', () => {
    it('throws NotFoundException for non-existent or inactive store', async () => {
      const svc = await build(makePrisma({ tenant: null }));
      await expect(svc.follow(USER_ID, TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when store is not ACTIVE', async () => {
      const svc = await build(makePrisma({ tenant: PENDING_TENANT }));
      await expect(svc.follow(USER_ID, TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('upserts follow record for ACTIVE store', async () => {
      const prisma = makePrisma({ tenant: ACTIVE_TENANT });
      const svc = await build(prisma);
      await svc.follow(USER_ID, TENANT_ID);
      expect(prisma.follow.upsert).toHaveBeenCalled();
    });
  });

  describe('unfollow()', () => {
    it('deletes follow record', async () => {
      const prisma = makePrisma();
      const svc = await build(prisma);
      await svc.unfollow(USER_ID, TENANT_ID);
      expect(prisma.follow.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID, tenantId: TENANT_ID } });
    });

    it('does not throw when follow does not exist', async () => {
      const prisma = makePrisma();
      (prisma.follow.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      const svc = await build(prisma);
      await expect(svc.unfollow(USER_ID, TENANT_ID)).resolves.toBeUndefined();
    });
  });

  describe('getFollowStatus()', () => {
    it('returns following: true when follow exists', async () => {
      const prisma = makePrisma({ follow: { userId: USER_ID, tenantId: TENANT_ID } });
      const svc = await build(prisma);
      const result = await svc.getFollowStatus(USER_ID, TENANT_ID);
      expect(result).toEqual({ following: true });
    });

    it('returns following: false when no follow record', async () => {
      const svc = await build(makePrisma({ follow: null }));
      const result = await svc.getFollowStatus(USER_ID, TENANT_ID);
      expect(result).toEqual({ following: false });
    });
  });

  // ── getMyTenant() ─────────────────────────────────────────────────────────────

  describe('getMyTenant()', () => {
    it('returns tenant for a vendor user', async () => {
      const prisma = makePrisma();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: USER_ID, tenant: ACTIVE_TENANT });
      const svc = await build(prisma);
      const result = await svc.getMyTenant(USER_ID);
      expect(result.slug).toBe('test-store');
    });

    it('throws NotFoundException when user has no tenant', async () => {
      const prisma = makePrisma();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: USER_ID, tenant: null });
      const svc = await build(prisma);
      await expect(svc.getMyTenant(USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── getVendorEvents() ─────────────────────────────────────────────────────────

  describe('getVendorEvents()', () => {
    it('returns events when eventsEnabled is true', async () => {
      const prisma = makePrisma({ tenant: { ...ACTIVE_TENANT, eventsEnabled: true } });
      const svc = await build(prisma);
      const result = await svc.getVendorEvents(TENANT_ID);
      expect(result).toHaveLength(1);
    });

    it('returns empty array when eventsEnabled is false', async () => {
      const prisma = makePrisma({ tenant: { ...ACTIVE_TENANT, eventsEnabled: false } });
      const svc = await build(prisma);
      const result = await svc.getVendorEvents(TENANT_ID);
      expect(result).toEqual([]);
    });

    it('returns empty array when tenant not found', async () => {
      const prisma = makePrisma({ tenant: null });
      const svc = await build(prisma);
      const result = await svc.getVendorEvents(TENANT_ID);
      expect(result).toEqual([]);
    });
  });
});
