import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QueueService } from '../queue/queue.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ApplyVendorDto } from './dto/apply-vendor.dto';
import { ReviewVendorDto, VendorDecision } from './dto/review-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { QueryVendorsDto } from './dto/query-vendors.dto';
import { TenantStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class VendorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly permissions: PermissionsService,
  ) {}

  async apply(dto: ApplyVendorDto) {
    const [slugExists, emailExists] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { slug: dto.slug } }),
      this.prisma.user.findUnique({ where: { email: dto.ownerEmail } }),
    ]);

    if (slugExists) throw new ConflictException('This store slug is already taken');
    if (emailExists) throw new ConflictException('This email is already registered');

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);

    const tenant = await this.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          slug: dto.slug,
          displayName: dto.displayName,
          artistType: dto.artistType,
          bio: dto.bio,
          status: TenantStatus.PENDING,
        },
      });

      const owner = await tx.user.create({
        data: {
          email: dto.ownerEmail,
          passwordHash,
          role: UserRole.VENDOR_OWNER,
          tenantId: newTenant.id,
        },
      });

      return { newTenant, ownerId: owner.id };
    });

    // Grant the platform-default permission set; the vendor gets useful access
    // immediately (still bound by tenant.status === ACTIVE for storefront visibility).
    await this.permissions.grantDefaults(tenant.newTenant.id, tenant.ownerId);

    return tenant.newTenant;
  }

  async review(tenantId: string, dto: ReviewVendorDto, actorId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Vendor not found');

    if (tenant.status !== TenantStatus.PENDING) {
      throw new BadRequestException(
        `Cannot review a vendor that is already ${tenant.status}`,
      );
    }

    const newStatus =
      dto.decision === VendorDecision.APPROVE ? TenantStatus.ACTIVE : TenantStatus.REJECTED;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: newStatus },
    });

    await this.audit.log({
      actorId,
      action: `VENDOR_${dto.decision}`,
      targetType: 'Tenant',
      targetId: tenantId,
      metadata: { reason: dto.reason, newStatus },
    });

    if (newStatus === TenantStatus.ACTIVE) {
      const owner = await this.prisma.user.findFirst({
        where: { tenantId, role: UserRole.VENDOR_OWNER },
        select: { email: true },
      });

      if (owner) {
        await this.queue.sendMail({
          type: 'VENDOR_WELCOME',
          to: owner.email,
          tenantDisplayName: updated.displayName,
        });
      }
    }

    return updated;
  }

  async findAll(query: QueryVendorsDto, adminView = false) {
    const where: any = {};

    // Public browsing only sees ACTIVE tenants; admins can filter freely
    if (!adminView) {
      where.status = TenantStatus.ACTIVE;
    } else if (query.status) {
      where.status = query.status;
    }

    if (query.artistType) where.artistType = query.artistType;
    if (query.search) {
      // Clamp search to 100 chars to prevent ReDoS via very long patterns
      const safeSearch = query.search.slice(0, 100);
      where.OR = [
        { displayName: { contains: safeSearch, mode: 'insensitive' } },
        { slug: { contains: safeSearch, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      include: {
        _count: { select: { followers: true, products: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Store not found');
    return tenant;
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Vendor not found');
    return tenant;
  }

  async update(tenantId: string, dto: UpdateVendorDto, actorId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Vendor not found');

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    });

    await this.audit.log({
      actorId,
      action: 'VENDOR_UPDATED',
      targetType: 'Tenant',
      targetId: tenantId,
      metadata: { changes: dto },
    });

    return updated;
  }

  async follow(userId: string, tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
      throw new NotFoundException('Store not found');
    }

    await this.prisma.follow.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      create: { userId, tenantId },
      update: {},
    });
  }

  async unfollow(userId: string, tenantId: string) {
    await this.prisma.follow.deleteMany({ where: { userId, tenantId } });
  }

  async getFollowStatus(userId: string, tenantId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    return { following: !!follow };
  }

  async getMyTenant(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user?.tenant) throw new NotFoundException('No store associated with this account');
    return user.tenant;
  }

  async getVendorEvents(tenantId: string) {
    // Respect per-vendor feature toggle: if events are disabled, return empty.
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { eventsEnabled: true },
    });
    if (!tenant || !tenant.eventsEnabled) return [];

    return this.prisma.vendorEvent.findMany({
      where: { tenantId, active: true },
      orderBy: { date: 'asc' },
    });
  }
}
