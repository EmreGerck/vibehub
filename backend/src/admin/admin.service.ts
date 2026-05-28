import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { VendorService } from '../vendor/vendor.service';
import { TenantStatus, UserRole } from '@prisma/client';
import { PatchVendorStatusDto, PatchCommissionDto } from './dto/patch-vendor.dto';
import { CreateAdminUserDto } from './dto/create-admin.dto';
import { QueryVendorsDto } from '../vendor/dto/query-vendors.dto';
import { QueryOrdersDto } from '../order/dto/query-orders.dto';
import { QueryAuditDto } from './dto/query-audit.dto';
import { QueryProductsDto } from '../product/dto/query-products.dto';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';
import { AdminCreateProductDto, AdminUpdateProductDto, AdminProductDiscountDto, AdminProductPreOrderDto } from './dto/admin-product.dto';
import {
  AdminCreateVariantDto,
  AdminUpdateVariantDto,
  AdminUpdateUserDto,
  AdminResetPasswordDto,
  AdminUpdateTenantDto,
  AdminCancelOrderDto,
  AdminQueryReviewsDto,
  AdminUpdateReviewDto,
  AdminCreateVendorDto,
} from './dto/admin-extras.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { MailService } from '../mail/mail.service';
import { SeoService } from '../seo/seo.service';
import { OrderStatus, ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

/** Escape a field for safe CSV inclusion (quote + double inner quotes). */
function csvEscape(value: string): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly vendor: VendorService,
    private readonly permissions: PermissionsService,
    private readonly mail: MailService,
    private readonly seo: SeoService,
  ) {}

  // ── Platform overview stats ───────────────────────────────────────────────────

  async getPlatformOverview() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalOrders,
      ordersLast30d,
      activeVendors,
      pendingVendors,
      totalCustomers,
      pendingReviews,
      totalProducts,
      recentAuditEvents,
      gmvRaw,
      gmvLast30dRaw,
      // ── Action-required counts (drives dashboard inbox widget) ──
      ordersAwaitingShipment,
      ordersAwaitingRefundReview,
      productsAwaitingApproval,
      returnShipmentsAwaitingDepot,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.review.count(),
      this.prisma.product.count({ where: { status: ProductStatus.LIVE } }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          actor: { select: { email: true } },
        },
      }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true } }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.order.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.order.count({ where: { status: 'REFUND_REQUESTED' as any } }),
      this.prisma.product.count({ where: { status: ProductStatus.PENDING_REVIEW } }),
      (this.prisma as any).returnShipment.count({
        where: { status: { in: ['INITIATED', 'DROPPED_OFF', 'IN_TRANSIT'] } },
      }).catch(() => 0),
    ]);

    const toNumber = (d: any) => (d ? parseFloat(d.toString()) : 0);

    return {
      orders: {
        total: totalOrders,
        last30Days: ordersLast30d,
      },
      gmv: {
        total: toNumber(gmvRaw._sum.totalAmount),
        last30Days: toNumber(gmvLast30dRaw._sum.totalAmount),
      },
      vendors: {
        active: activeVendors,
        pending: pendingVendors,
      },
      customers: totalCustomers,
      products: totalProducts,
      totalReviews: pendingReviews,
      // ── Action-required inbox (admin operational dashboard) ──
      actionRequired: {
        ordersAwaitingShipment,         // CONFIRMED → create kargo
        refundRequestsPending: ordersAwaitingRefundReview,  // REFUND_REQUESTED → approve/reject
        productsAwaitingApproval,       // PENDING_REVIEW → review submission
        returnShipmentsInTransit: returnShipmentsAwaitingDepot,  // Track for depot arrival
        vendorApplicationsPending: pendingVendors,
        totalActionable:
          ordersAwaitingShipment +
          ordersAwaitingRefundReview +
          productsAwaitingApproval +
          pendingVendors,
      },
      recentAuditEvents: recentAuditEvents.map((e) => ({
        id: e.id,
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        actorEmail: e.actor?.email ?? 'system',
        createdAt: e.createdAt,
      })),
    };
  }

  // ── Admin create vendor (admin-only path; bypasses public apply flow) ─────────

  async adminCreateVendor(dto: AdminCreateVendorDto, actorId: string) {
    const slugClash = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (slugClash) throw new ConflictException(`Slug "${dto.slug}" is already taken`);

    let emailClash = null as null | { id: string };
    if (dto.ownerEmail) {
      emailClash = await this.prisma.user.findUnique({
        where: { email: dto.ownerEmail },
        select: { id: true },
      });
      if (emailClash) {
        throw new ConflictException(`Email "${dto.ownerEmail}" is already registered`);
      }
      if (!dto.ownerPassword) {
        throw new BadRequestException('ownerPassword required when ownerEmail is provided');
      }
    }

    const passwordHash = dto.ownerPassword ? await bcrypt.hash(dto.ownerPassword, 12) : null;

    const tenant = await this.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          slug: dto.slug,
          displayName: dto.displayName,
          artistType: dto.artistType,
          status: dto.status ?? TenantStatus.ACTIVE,
          ...(dto.commissionRate !== undefined && { commissionRate: dto.commissionRate }),
          ...(dto.bio !== undefined && { bio: dto.bio }),
          ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
          ...(dto.bannerUrl !== undefined && { bannerUrl: dto.bannerUrl }),
        },
      });

      if (dto.ownerEmail && passwordHash) {
        await tx.user.create({
          data: {
            email: dto.ownerEmail,
            passwordHash,
            role: UserRole.VENDOR_OWNER,
            tenantId: newTenant.id,
          },
        });
      }

      return newTenant;
    });

    await this.permissions.grantDefaults(tenant.id, actorId);

    await this.audit.log({
      actorId,
      action: 'ADMIN_VENDOR_CREATED',
      targetType: 'Tenant',
      targetId: tenant.id,
      metadata: {
        slug: tenant.slug,
        status: tenant.status,
        hasOwner: !!dto.ownerEmail, // store presence only — not the email itself
      },
    });

    return tenant;
  }

  // ── Vendors ───────────────────────────────────────────────────────────────────

  async getVendors(query: QueryVendorsDto) {
    return this.vendor.findAll(query, true);
  }

  async patchVendorStatus(tenantId: string, dto: PatchVendorStatusDto, actorId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Vendor not found');

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: dto.status },
    });

    await this.audit.log({
      actorId,
      action: `ADMIN_VENDOR_STATUS_${dto.status}`,
      targetType: 'Tenant',
      targetId: tenantId,
      metadata: { from: tenant.status, to: dto.status, reason: dto.reason },
    });

    return updated;
  }

  async patchCommission(tenantId: string, dto: PatchCommissionDto, actorId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Vendor not found');

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { commissionRate: dto.commissionRate },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_COMMISSION_UPDATED',
      targetType: 'Tenant',
      targetId: tenantId,
      metadata: {
        from: Number(tenant.commissionRate),
        to: dto.commissionRate,
      },
    });

    return updated;
  }

  /**
   * God-user only: toggle per-vendor feature flags (forum/media/events/nfc).
   * Returns the updated flag set.
   */
  async patchVendorFeatures(
    tenantId: string,
    dto: import('./dto/vendor-features.dto').PatchVendorFeaturesDto,
    actorId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        forumEnabled: true,
        mediaEnabled: true,
        eventsEnabled: true,
        nfcEnabled: true,
      },
    });
    if (!tenant) throw new NotFoundException('Vendor not found');

    const data: Record<string, boolean> = {};
    if (dto.forumEnabled !== undefined) data.forumEnabled = dto.forumEnabled;
    if (dto.mediaEnabled !== undefined) data.mediaEnabled = dto.mediaEnabled;
    if (dto.eventsEnabled !== undefined) data.eventsEnabled = dto.eventsEnabled;
    if (dto.nfcEnabled !== undefined) data.nfcEnabled = dto.nfcEnabled;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
      select: {
        id: true,
        slug: true,
        displayName: true,
        forumEnabled: true,
        mediaEnabled: true,
        eventsEnabled: true,
        nfcEnabled: true,
      },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_VENDOR_FEATURES_PATCHED',
      targetType: 'Tenant',
      targetId: tenantId,
      metadata: {
        slug: tenant.slug,
        before: {
          forumEnabled: tenant.forumEnabled,
          mediaEnabled: tenant.mediaEnabled,
          eventsEnabled: tenant.eventsEnabled,
          nfcEnabled: tenant.nfcEnabled,
        },
        after: data,
      },
    });

    return updated;
  }

  /**
   * God-user only: get or initialize the forum settings for a vendor.
   * Creates a default settings row if none exists.
   */
  async getForumSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Vendor not found');

    let settings = await this.prisma.forumSettings.findUnique({ where: { tenantId } });
    if (!settings) {
      settings = await this.prisma.forumSettings.create({ data: { tenantId } });
    }
    return settings;
  }

  /**
   * God-user only: update the forum sub-settings. Partial — only provided
   * fields are written.
   */
  async patchForumSettings(
    tenantId: string,
    dto: import('./dto/vendor-features.dto').PatchForumSettingsDto,
    actorId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Vendor not found');

    // Validate semantic constraint that class-validator can't express cross-field.
    if (
      dto.minPostLength !== undefined &&
      dto.maxPostLength !== undefined &&
      dto.minPostLength > dto.maxPostLength
    ) {
      throw new BadRequestException('minPostLength cannot exceed maxPostLength');
    }

    const updated = await this.prisma.forumSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: dto,
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_FORUM_SETTINGS_PATCHED',
      targetType: 'ForumSettings',
      targetId: updated.id,
      metadata: { tenantId, slug: tenant.slug, changes: dto },
    });

    return updated;
  }

  // ── Pre-orders ──────────────────────────────────────────────────────────────

  /**
   * List pre-order order items with optional status filter. Includes related
   * order, customer, product (via variant), and tenant info needed by the UI.
   */
  async listPreOrders(query: {
    status?: import('@prisma/client').PreOrderStatus;
    tenantId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 100);
    const where: any = { isPreOrder: true };
    if (query.status) where.preOrderStatus = query.status;
    if (query.tenantId) where.tenantId = query.tenantId;

    const [items, total] = await Promise.all([
      this.prisma.orderItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              createdAt: true,
              shippingAddress: true,
              customer: { select: { id: true, email: true } },
            },
          },
          tenant: { select: { id: true, slug: true, displayName: true } },
          variant: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  images: true,
                  isPreOrder: true,
                  preOrderShipDate: true,
                  preOrderEndsAt: true,
                  preOrderLimit: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.orderItem.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Move a pre-order line item to a new status. When transitioning to
   * APPROVED, sends the customer an email.
   */
  async patchPreOrderStatus(
    itemId: string,
    dto: { status: import('@prisma/client').PreOrderStatus; note?: string },
    actorId: string,
  ) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: { include: { customer: { select: { id: true, email: true } } } },
        variant: { include: { product: { select: { title: true, preOrderShipDate: true } } } },
      },
    });
    if (!item) throw new NotFoundException('Order item not found');
    if (!item.isPreOrder) throw new BadRequestException('This order item is not a pre-order');

    const updated = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { preOrderStatus: dto.status },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_PRE_ORDER_STATUS_PATCHED',
      targetType: 'OrderItem',
      targetId: itemId,
      metadata: {
        orderId: item.orderId,
        from: item.preOrderStatus,
        to: dto.status,
        note: dto.note,
      },
    });

    // Notify the customer on approval (fire-and-forget — don't fail the API call
    // if email delivery has a hiccup).
    if (dto.status === 'APPROVED' && item.order.customer?.email) {
      const orderUrl = `${process.env.FRONTEND_URL ?? ''}/profile/orders/${item.orderId}`;
      void this.mail
        .sendPreOrderApproved(item.order.customer.email, {
          orderId: item.orderId,
          productTitle: item.variant.product.title,
          qty: item.qty,
          shipDate: item.preOrderShipDate ?? item.variant.product.preOrderShipDate ?? null,
          orderUrl,
        })
        .catch((err) =>
          // eslint-disable-next-line no-console
          console.error('[pre-order email]', err),
        );
    }

    return updated;
  }

  /**
   * Permanently delete a vendor and ALL related entities.
   * - Safe by default: refuses if vendor has any orders or payouts.
   * - With `force=true`, cascades through orderItems/shipments/payouts as well.
   * - Members (User.tenantId) are released — they become customers, not deleted.
   * - HeroBanners and NfcTags are detached (tenantId set to null) so the data isn't lost.
   * - Products, ProductVariants, Reviews, Wishlist items, ForumChannels, ForumTopics,
   *   ForumReplies, ForumReactions, VendorMedia, VendorEvent, Follow, TenantPermission
   *   are all destroyed (some via Prisma cascade, the rest explicitly).
   */
  async deleteVendor(tenantId: string, actorId: string, force = false) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            products: true,
            orderItems: true,
            payouts: true,
            users: true,
          },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Vendor not found');

    // Safety check: don't delete a vendor with financial history unless forced
    if (!force && (tenant._count.orderItems > 0 || tenant._count.payouts > 0)) {
      throw new ConflictException(
        `Vendor has ${tenant._count.orderItems} order items and ${tenant._count.payouts} payouts. Pass force=true to delete anyway.`,
      );
    }

    const counts = { ...tenant._count };

    await this.prisma.$transaction(async (tx) => {
      // 1. Release members (don't delete users)
      await tx.user.updateMany({
        where: { tenantId },
        data: { tenantId: null, role: 'CUSTOMER' as any },
      });

      // 2. Detach hero banners & NFC tags (keep the records, just unlink)
      await tx.heroBanner.updateMany({ where: { tenantId }, data: { tenantId: null } });
      await tx.nfcTag.updateMany({ where: { tenantId }, data: { tenantId: null } });

      // 3. Delete product subgraph: variants → wishlist/reviews → products
      const products = await tx.product.findMany({ where: { tenantId }, select: { id: true } });
      const productIds = products.map((p) => p.id);
      if (productIds.length > 0) {
        await tx.wishlist.deleteMany({ where: { productId: { in: productIds } } });
        await tx.review.deleteMany({ where: { productId: { in: productIds } } });
        await tx.productVariant.deleteMany({ where: { productId: { in: productIds } } });
        await tx.product.deleteMany({ where: { id: { in: productIds } } });
      }

      // 4. If forced, blow away financial records too
      if (force) {
        await tx.shipment.deleteMany({ where: { tenantId } });
        await tx.orderItem.deleteMany({ where: { tenantId } });
        await tx.payout.deleteMany({ where: { tenantId } });
      }

      // 5. Finally delete the tenant — Prisma cascades the rest
      //    (TenantPermission, Follow, ForumSettings, ForumChannel, ForumTopic,
      //     VendorMedia, VendorEvent)
      await tx.tenant.delete({ where: { id: tenantId } });
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_VENDOR_DELETED',
      targetType: 'Tenant',
      targetId: tenantId,
      metadata: {
        slug: tenant.slug,
        displayName: tenant.displayName,
        force,
        counts,
      },
    });

    return { id: tenantId, slug: tenant.slug, displayName: tenant.displayName, deleted: true };
  }

  // ── Orders ────────────────────────────────────────────────────────────────────

  async getAllOrders(query: QueryOrdersDto) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.tenantId) where.items = { some: { tenantId: query.tenantId } };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, email: true } },
          items: {
            include: {
              tenant: { select: { id: true, slug: true, displayName: true } },
              variant: { include: { product: { select: { id: true, title: true } } } },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  // ── Products ──────────────────────────────────────────────────────────────────

  async getPendingProducts(query: QueryProductsDto) {
    const where = { status: 'PENDING_REVIEW' as const };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'asc' },
        include: {
          tenant: { select: { id: true, slug: true, displayName: true } },
          variants: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  // ── Financials ────────────────────────────────────────────────────────────────

  async getFinancialSummary() {
    const [
      gmvResult,
      orderCount,
      vendorCount,
      pendingPayouts,
      recentOrders,
    ] = await Promise.all([
      // Total GMV (sum of all order totals, excluding cancelled/refunded)
      this.prisma.order.aggregate({
        where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Total order count
      this.prisma.order.count(),
      // Active vendor count
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      // Pending payout total
      this.prisma.payout.aggregate({
        where: { status: 'PENDING' },
        _sum: { netAmount: true, platformFee: true },
        _count: true,
      }),
      // Vendor payout totals from order items (on non-cancelled/refunded orders)
      this.prisma.orderItem.aggregate({
        where: {
          order: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        },
        _sum: {
          vendorPayoutAmount: true,
        },
      }),
    ]);

    const totalGmv = Number(gmvResult._sum.totalAmount ?? 0);

    // Platform fee = GMV - total vendor payouts (vendorPayoutAmount is already qty-adjusted)
    const totalVendorPayouts = Number(recentOrders._sum.vendorPayoutAmount ?? 0);
    const totalPlatformFees = totalGmv - totalVendorPayouts;

    return {
      gmv: totalGmv,
      totalOrders: orderCount,
      activeVendors: vendorCount,
      platformFees: totalPlatformFees,
      pendingPayouts: {
        count: pendingPayouts._count,
        netAmount: Number(pendingPayouts._sum.netAmount ?? 0),
        platformFee: Number(pendingPayouts._sum.platformFee ?? 0),
      },
      averageOrderValue: orderCount > 0 ? totalGmv / orderCount : 0,
    };
  }

  // ── Users ─────────────────────────────────────────────────────────────────────

  async createAdminUser(dto: CreateAdminUserDto, actorId: string) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: UserRole.PLATFORM_ADMIN,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_USER_CREATED',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: dto.email, role: UserRole.PLATFORM_ADMIN },
    });

    return user;
  }

  async getUsers(role?: UserRole) {
    const where = role ? { role } : {};
    return this.prisma.user.findMany({
      where,
      select: { id: true, email: true, role: true, tenantId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ── Hero Banners ──────────────────────────────────────────────────────────────

  async getBanners() {
    return this.prisma.heroBanner.findMany({
      include: { tenant: { select: { id: true, slug: true, displayName: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createBanner(dto: CreateBannerDto, actorId?: string) {
    const { tenantId, ...rest } = dto;
    const banner = await this.prisma.heroBanner.create({
      data: {
        ...rest,
        translations: rest.translations as any,
        ...(tenantId ? { tenant: { connect: { id: tenantId } } } : {}),
      },
    });
    if (actorId) {
      await this.audit.log({
        actorId, action: 'ADMIN_BANNER_CREATED', targetType: 'HeroBanner', targetId: banner.id,
        metadata: { tenantId, sortOrder: banner.sortOrder, active: banner.active },
      });
    }
    return banner;
  }

  async updateBanner(id: string, dto: UpdateBannerDto, actorId?: string) {
    const banner = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    const { tenantId, ...rest } = dto;
    const updated = await this.prisma.heroBanner.update({
      where: { id },
      data: {
        ...rest,
        translations: rest.translations as any,
        ...(tenantId !== undefined
          ? tenantId
            ? { tenant: { connect: { id: tenantId } } }
            : { tenant: { disconnect: true } }
          : {}),
      },
    });
    if (actorId) {
      await this.audit.log({
        actorId, action: 'ADMIN_BANNER_UPDATED', targetType: 'HeroBanner', targetId: id,
        metadata: { changedFields: Object.keys(dto) },
      });
    }
    return updated;
  }

  async deleteBanner(id: string, actorId?: string) {
    const banner = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    await this.prisma.heroBanner.delete({ where: { id } });
    if (actorId) {
      await this.audit.log({
        actorId, action: 'ADMIN_BANNER_DELETED', targetType: 'HeroBanner', targetId: id,
        metadata: { sortOrder: banner.sortOrder, tenantId: (banner as any).tenantId },
      });
    }
    return { deleted: true };
  }

  async toggleBanner(id: string, actorId?: string) {
    const banner = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    const updated = await this.prisma.heroBanner.update({
      where: { id },
      data: { active: !banner.active },
    });
    if (actorId) {
      await this.audit.log({
        actorId, action: 'ADMIN_BANNER_TOGGLED', targetType: 'HeroBanner', targetId: id,
        metadata: { from: banner.active, to: updated.active },
      });
    }
    return updated;
  }

  // ── Admin Product CRUD ────────────────────────────────────────────────────────

  async getAllProducts(query: QueryProductsDto) {
    const where: any = {};
    if ((query as any).tenantId) where.tenantId = (query as any).tenantId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, slug: true, displayName: true } },
          variants: true,
          _count: { select: { reviews: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async adminCreateProduct(dto: AdminCreateProductDto, actorId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Vendor not found');

    const product = await this.prisma.product.create({
      data: {
        tenantId: dto.tenantId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        currency: dto.currency ?? 'TRY',
        images: dto.images ?? [],
        previewVideoUrl: dto.previewVideoUrl ?? null,
        tags: dto.tags ?? [],
        translations: (dto.translations ?? undefined) as any,
        status: ProductStatus.DRAFT,
        categoryId: dto.categoryId ?? null,
      },
      include: { variants: true, tenant: { select: { id: true, slug: true, displayName: true } } },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_PRODUCT_CREATED',
      targetType: 'Product',
      targetId: product.id,
      metadata: { title: product.title, tenantId: dto.tenantId },
    });

    return product;
  }

  async adminUpdateProduct(productId: string, dto: AdminUpdateProductDto, actorId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.previewVideoUrl !== undefined && { previewVideoUrl: dto.previewVideoUrl }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.translations !== undefined && { translations: dto.translations as any }),
        ...(dto.imageSettings !== undefined && { imageSettings: dto.imageSettings as any }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      },
      include: { variants: true, tenant: { select: { id: true, slug: true, displayName: true } } },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_PRODUCT_UPDATED',
      targetType: 'Product',
      targetId: productId,
    });

    return updated;
  }

  async adminSetProductDiscount(productId: string, dto: AdminProductDiscountDto, actorId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { compareAtPrice: dto.compareAtPrice },
      include: { variants: true, tenant: { select: { id: true, slug: true, displayName: true } } },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_PRODUCT_UPDATED',
      targetType: 'Product',
      targetId: productId,
      metadata: { compareAtPrice: dto.compareAtPrice },
    });

    return updated;
  }

  async adminSetProductPreOrder(productId: string, dto: AdminProductPreOrderDto, actorId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    // isPreOrder is derived: if preOrderEndsAt is set, the product is a pre-order
    const isPreOrder = dto.preOrderEndsAt !== null && dto.preOrderEndsAt !== undefined;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        isPreOrder,
        preOrderEndsAt: dto.preOrderEndsAt ? new Date(dto.preOrderEndsAt) : null,
        ...(dto.preOrderShipDate !== undefined && {
          preOrderShipDate: dto.preOrderShipDate ? new Date(dto.preOrderShipDate) : null,
        }),
        ...(dto.preOrderLimit !== undefined && { preOrderLimit: dto.preOrderLimit }),
      },
      include: { variants: true, tenant: { select: { id: true, slug: true, displayName: true } } },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_PRODUCT_UPDATED',
      targetType: 'Product',
      targetId: productId,
      metadata: { isPreOrder, preOrderEndsAt: dto.preOrderEndsAt },
    });

    return updated;
  }

  async adminPublishProduct(productId: string, actorId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.status === ProductStatus.LIVE) return product;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.LIVE },
      include: { variants: true, tenant: { select: { id: true, slug: true, displayName: true } } },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_PRODUCT_PUBLISHED',
      targetType: 'Product',
      targetId: productId,
    });

    // SEO: revalidate frontend cache + ping IndexNow so Google sees the new URL
    void this.seo.productChanged(productId, updated.tenant?.slug);

    return updated;
  }

  async adminUnpublishProduct(productId: string, actorId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED },
      include: { variants: true, tenant: { select: { id: true, slug: true, displayName: true } } },
    });

    // SEO: revalidate so the unpublished URL disappears from sitemap promptly
    void this.seo.productChanged(productId, updated.tenant?.slug);

    await this.audit.log({
      actorId,
      action: 'ADMIN_PRODUCT_UNPUBLISHED',
      targetType: 'Product',
      targetId: productId,
    });

    return updated;
  }

  async adminDeleteProduct(productId: string, actorId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.product.delete({ where: { id: productId } });

    await this.audit.log({
      actorId,
      action: 'ADMIN_PRODUCT_DELETED',
      targetType: 'Product',
      targetId: productId,
      metadata: { title: product.title },
    });

    return { deleted: true };
  }

  // ── Admin Variants CRUD ───────────────────────────────────────────────────────

  async adminCreateVariant(productId: string, dto: AdminCreateVariantDto, actorId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const skuClash = await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } });
    if (skuClash) throw new ConflictException(`SKU "${dto.sku}" already exists`);

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        sku: dto.sku,
        attributes: dto.attributes as any,
        priceOverride: dto.priceOverride ?? null,
        stockQty: dto.stockQty,
        lowStockThreshold: dto.lowStockThreshold ?? 5,
      },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_VARIANT_CREATED',
      targetType: 'ProductVariant',
      targetId: variant.id,
      metadata: { productId, sku: dto.sku },
    });

    return variant;
  }

  async adminUpdateVariant(variantId: string, dto: AdminUpdateVariantDto, actorId: string) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variant not found');

    if (dto.sku && dto.sku !== variant.sku) {
      const clash = await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } });
      if (clash) throw new ConflictException(`SKU "${dto.sku}" already exists`);
    }

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.attributes !== undefined && { attributes: dto.attributes as any }),
        ...(dto.priceOverride !== undefined && { priceOverride: dto.priceOverride }),
        ...(dto.stockQty !== undefined && { stockQty: dto.stockQty }),
        ...(dto.lowStockThreshold !== undefined && { lowStockThreshold: dto.lowStockThreshold }),
      },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_VARIANT_UPDATED',
      targetType: 'ProductVariant',
      targetId: variantId,
    });

    return updated;
  }

  async adminDeleteVariant(variantId: string, actorId: string) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variant not found');

    await this.prisma.productVariant.delete({ where: { id: variantId } });

    await this.audit.log({
      actorId,
      action: 'ADMIN_VARIANT_DELETED',
      targetType: 'ProductVariant',
      targetId: variantId,
      metadata: { sku: variant.sku, productId: variant.productId },
    });

    return { deleted: true };
  }

  // ── Admin User management ─────────────────────────────────────────────────────

  async adminUpdateUser(userId: string, dto: AdminUpdateUserDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const clash = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (clash) throw new ConflictException('Email already in use');
    }

    // GOD_USER role cannot be downgraded by anyone
    if (user.role === UserRole.GOD_USER && dto.role && dto.role !== UserRole.GOD_USER) {
      throw new BadRequestException('GOD_USER role cannot be downgraded');
    }

    // Only GOD_USER can assign PLATFORM_ADMIN or GOD_USER roles
    const privilegedRoles: UserRole[] = [UserRole.PLATFORM_ADMIN, UserRole.GOD_USER];
    if (dto.role && privilegedRoles.includes(dto.role)) {
      const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
      if (!actor || actor.role !== UserRole.GOD_USER) {
        throw new ForbiddenException('Only GOD_USER can assign admin roles');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.tenantId !== undefined && { tenantId: dto.tenantId }),
      },
      select: { id: true, email: true, name: true, role: true, tenantId: true, createdAt: true },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_USER_UPDATED',
      targetType: 'User',
      targetId: userId,
      metadata: {
        // Log role change without PII — use IDs only
        ...(dto.role && dto.role !== user.role ? { roleChange: { from: user.role, to: dto.role } } : {}),
        emailChanged: !!(dto.email && dto.email !== user.email),
      },
    });

    return updated;
  }

  async adminResetUserPassword(userId: string, dto: AdminResetPasswordDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // invalidate every refresh token so the user must re-login everywhere
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);

    await this.audit.log({
      actorId,
      action: 'ADMIN_USER_PASSWORD_RESET',
      targetType: 'User',
      targetId: userId,
    });

    return { reset: true };
  }

  async adminDeleteUser(userId: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.GOD_USER) {
      throw new BadRequestException('GOD_USER accounts cannot be deleted');
    }
    if (user.id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    // Hard delete cascades RefreshToken / PasswordResetToken; orders/reviews still
    // reference the user via FK without onDelete, so block delete if any exist.
    const [orderCount, reviewCount] = await Promise.all([
      this.prisma.order.count({ where: { customerId: userId } }),
      this.prisma.review.count({ where: { customerId: userId } }),
    ]);
    if (orderCount > 0 || reviewCount > 0) {
      throw new BadRequestException(
        `Cannot delete a user with order or review history (orders: ${orderCount}, reviews: ${reviewCount}). Reassign or anonymize first.`,
      );
    }

    await this.prisma.user.delete({ where: { id: userId } });

    await this.audit.log({
      actorId,
      action: 'ADMIN_USER_DELETED',
      targetType: 'User',
      targetId: userId,
      metadata: { email: user.email, role: user.role },
    });

    return { deleted: true };
  }

  // ── Customer 360 view: profile + orders + reviews + audit in one call ─────────

  async adminGetUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, phone: true, role: true, tenantId: true,
        avatarUrl: true, createdAt: true, updatedAt: true,
        lockedUntil: true,
        marketingConsent: true, termsAcceptedAt: true, privacyAcceptedAt: true,
        kvkkAcceptedAt: true, accountDeletedAt: true,
      } as any,
    });
    if (!user) throw new NotFoundException('User not found');

    const [
      orderCount, recentOrders, reviewCount, totalSpentRaw,
      followingCount, refundRequestCount, trustedDeviceCount,
      activeRefreshTokenCount, recentActivity,
    ] = await Promise.all([
      this.prisma.order.count({ where: { customerId: userId } }),
      // Use `as any` cast — deliveredAt column added in 20260528 migration but
      // Prisma types only regenerate at deploy; this lets type-check pass locally.
      (this.prisma.order.findMany as any)({
        where: { customerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, status: true, totalAmount: true, currency: true,
          createdAt: true, deliveredAt: true,
        },
      }),
      this.prisma.review.count({ where: { customerId: userId } }),
      this.prisma.order.aggregate({
        where: { customerId: userId, status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED'] } },
        _sum: { totalAmount: true },
      }),
      this.prisma.follow.count({ where: { userId } }).catch(() => 0),
      this.prisma.order.count({ where: { customerId: userId, status: 'REFUND_REQUESTED' as any } }),
      this.prisma.trustedDevice.count({ where: { userId } }),
      this.prisma.refreshToken.count({ where: { userId, expiresAt: { gt: new Date() } } }),
      this.prisma.auditLog.findMany({
        where: { actorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, action: true, targetType: true, targetId: true, createdAt: true },
      }),
    ]);

    return {
      user,
      stats: {
        orderCount,
        reviewCount,
        followingCount,
        refundRequestCount,
        trustedDeviceCount,
        activeSessionCount: activeRefreshTokenCount,
        totalSpent: Number(totalSpentRaw._sum.totalAmount ?? 0),
        isLocked: !!((user as any).lockedUntil && new Date((user as any).lockedUntil as string) > new Date()),
      },
      recentOrders,
      recentActivity,
    };
  }

  async adminUnlockUser(userId: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, lockedUntil: true } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: null } as any,
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_USER_UNLOCKED',
      targetType: 'User',
      targetId: userId,
      metadata: { previousLockedUntil: user.lockedUntil },
    });

    return { unlocked: true };
  }

  // ── Order CSV export ──────────────────────────────────────────────────────────

  async exportOrdersCsv(filters: { status?: string; tenantId?: string; from?: string; to?: string; q?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to)   where.createdAt.lte = new Date(filters.to);
    }
    if (filters.tenantId) {
      where.items = { some: { tenantId: filters.tenantId } };
    }
    if (filters.q) {
      where.OR = [
        { id: { contains: filters.q, mode: 'insensitive' } },
        { paymentRef: { contains: filters.q, mode: 'insensitive' } },
        { customer: { email: { contains: filters.q, mode: 'insensitive' } } },
        { customer: { name: { contains: filters.q, mode: 'insensitive' } } },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      take: 5000, // cap to keep memory bounded; admin can narrow filters
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { email: true, name: true } },
        items: { select: { qty: true, unitPriceSnapshot: true } },
      },
    });

    const rows: string[] = [
      // Header
      'OrderID,Date,Customer,Email,Status,Items,Subtotal,Total,Currency,InvoiceNumber,PaymentRef,DeliveredAt,RefundedAt',
    ];

    for (const o of orders) {
      const itemCount = o.items.reduce((s, i) => s + i.qty, 0);
      const subtotal = o.items.reduce((s, i) => s + Number(i.unitPriceSnapshot) * i.qty, 0);
      const fields = [
        o.id,
        new Date(o.createdAt).toISOString(),
        csvEscape(o.customer?.name ?? ''),
        csvEscape(o.customer?.email ?? ''),
        o.status,
        String(itemCount),
        subtotal.toFixed(2),
        Number(o.totalAmount).toFixed(2),
        o.currency,
        csvEscape((o as any).invoiceNumber ?? ''),
        csvEscape(o.paymentRef ?? ''),
        (o as any).deliveredAt ? new Date((o as any).deliveredAt).toISOString() : '',
        (o as any).refundedAt ? new Date((o as any).refundedAt).toISOString() : '',
      ];
      rows.push(fields.join(','));
    }

    // Return the CSV as a plain text response; controller wraps in ApiResponse usually,
    // but for download we need to return raw text. Caller can set headers in the controller.
    return {
      csv: rows.join('\n'),
      filename: `vibehub-orders-${new Date().toISOString().slice(0, 10)}.csv`,
      count: orders.length,
    };
  }

  // ── Admin Tenant deep-edit ────────────────────────────────────────────────────

  async adminUpdateTenant(tenantId: string, dto: AdminUpdateTenantDto, actorId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Vendor not found');

    if (dto.slug && dto.slug !== tenant.slug) {
      const clash = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException(`Slug "${dto.slug}" already in use`);
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.artistType !== undefined && { artistType: dto.artistType }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.commissionRate !== undefined && { commissionRate: dto.commissionRate }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.bannerUrl !== undefined && { bannerUrl: dto.bannerUrl }),
      },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_TENANT_UPDATED',
      targetType: 'Tenant',
      targetId: tenantId,
      metadata: { changes: dto },
    });

    return updated;
  }

  // ── Admin Order cancel + refund ───────────────────────────────────────────────

  async adminCancelOrder(orderId: string, dto: AdminCancelOrderDto, actorId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (([OrderStatus.CANCELLED, OrderStatus.REFUNDED] as OrderStatus[]).includes(order.status)) {
      throw new BadRequestException(`Order is already ${order.status}`);
    }

    const restock = dto.restock ?? true;
    const updated = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
      if (restock) {
        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQty: { increment: item.qty } },
          });
        }
      }
      return o;
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_ORDER_CANCELLED',
      targetType: 'Order',
      targetId: orderId,
      metadata: { reason: dto.reason, restock, previousStatus: order.status },
    });

    return updated;
  }

  // adminRefundOrder() removed 2026-05-28 — see admin.controller.ts note.
  // Use OrderService.approveRefundRequest() for the customer-initiated flow.

  // ── Admin Review moderation ───────────────────────────────────────────────────

  async adminListReviews(query: AdminQueryReviewsDto) {
    const where: any = {};
    if (query.productId) where.productId = query.productId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.minRating !== undefined || query.maxRating !== undefined) {
      where.rating = {};
      if (query.minRating !== undefined) where.rating.gte = query.minRating;
      if (query.maxRating !== undefined) where.rating.lte = query.maxRating;
    }

    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: query.skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, title: true, tenantId: true } },
          customer: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async adminUpdateReview(reviewId: string, dto: AdminUpdateReviewDto, actorId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
      },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_REVIEW_UPDATED',
      targetType: 'Review',
      targetId: reviewId,
    });

    return updated;
  }

  async adminDeleteReview(reviewId: string, actorId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.review.delete({ where: { id: reviewId } });

    await this.audit.log({
      actorId,
      action: 'ADMIN_REVIEW_DELETED',
      targetType: 'Review',
      targetId: reviewId,
      metadata: { rating: review.rating, productId: review.productId },
    });

    return { deleted: true };
  }

  // ── Audit log ─────────────────────────────────────────────────────────────────

  async getAuditLog(query: QueryAuditDto) {
    const where: any = {};
    if (query.actorId) where.actorId = query.actorId;
    if (query.targetType) where.targetType = query.targetType;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, email: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  // ── Events ────────────────────────────────────────────────────────────────────

  async listEvents(query: any) {
    const where: any = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.provider) where.provider = query.provider;
    if (query.fromDate || query.toDate) {
      where.date = {};
      if (query.fromDate) where.date.gte = new Date(query.fromDate);
      if (query.toDate) where.date.lte = new Date(query.toDate);
    }
    const [items, total] = await Promise.all([
      this.prisma.vendorEvent.findMany({
        where,
        orderBy: { date: 'asc' },
        skip: query.skip ?? 0,
        take: query.limit ?? 20,
        include: { tenant: { select: { displayName: true, slug: true } } },
      }),
      this.prisma.vendorEvent.count({ where }),
    ]);
    return { items, total, page: query.page ?? 1, limit: query.limit ?? 20 };
  }

  async createEvent(dto: any, actorId: string) {
    const event = await this.prisma.vendorEvent.create({
      data: {
        tenantId: dto.tenantId,
        title: dto.title,
        description: dto.description,
        href: dto.href,
        provider: dto.provider,
        date: new Date(dto.date),
        venue: dto.venue,
        imageUrl: dto.imageUrl,
      },
    });
    await this.audit.log({
      actorId,
      action: 'EVENT_CREATE',
      targetType: 'VendorEvent',
      targetId: event.id,
      metadata: { title: dto.title, tenantId: dto.tenantId },
    });
    return event;
  }

  async updateEvent(id: string, dto: any, actorId: string) {
    const event = await this.prisma.vendorEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    const updated = await this.prisma.vendorEvent.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.href !== undefined && { href: dto.href }),
        ...(dto.provider !== undefined && { provider: dto.provider }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.venue !== undefined && { venue: dto.venue }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
    await this.audit.log({ actorId, action: 'EVENT_UPDATE', targetType: 'VendorEvent', targetId: id, metadata: dto });
    return updated;
  }

  async deleteEvent(id: string, actorId: string) {
    const event = await this.prisma.vendorEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    await this.prisma.vendorEvent.delete({ where: { id } });
    await this.audit.log({ actorId, action: 'EVENT_DELETE', targetType: 'VendorEvent', targetId: id, metadata: {} });
    return { deleted: true };
  }

  // ── Analytics ─────────────────────────────────────────────────────────────────

  async getAnalyticsOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, newUsersThisMonth,
      totalOrders, ordersThisMonth,
      revenueThisMonth, revenueAllTime,
      activeVendors, totalProducts,
      buyerIds, reviewCount, totalVendorUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.order.count({ where: { status: { not: 'CANCELLED' as any } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' as any } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' as any } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: 'CANCELLED' as any } } }),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' as any } }),
      this.prisma.product.count({ where: { status: 'LIVE' as any } }),
      this.prisma.order.findMany({ distinct: ['customerId'], select: { customerId: true }, where: { status: { not: 'CANCELLED' as any } } }),
      this.prisma.review.count(),
      this.prisma.user.count({ where: { role: { in: ['VENDOR_OWNER', 'VENDOR_MANAGER'] as any } } }),
    ]);

    const purchaserCount = buyerIds.length;
    const customerCount = await this.prisma.user.count({ where: { role: 'CUSTOMER' as any } });
    const browsers = customerCount - purchaserCount;

    return {
      totalUsers,
      newUsersThisMonth,
      totalOrders,
      ordersThisMonth,
      revenueThisMonth: Number(revenueThisMonth._sum.totalAmount ?? 0),
      revenueAllTime: Number(revenueAllTime._sum.totalAmount ?? 0),
      activeVendors,
      totalProducts,
      purchasers: purchaserCount,
      browsers: Math.max(0, browsers),
      reviewCount,
      totalVendorUsers,
      conversionRate: customerCount > 0 ? +((purchaserCount / customerCount) * 100).toFixed(1) : 0,
    };
  }

  async getRevenueTrend(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: startDate }, status: { not: 'CANCELLED' as any } },
      select: { createdAt: true, totalAmount: true },
    });
    const byDay: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      byDay[d.toISOString().split('T')[0]] = 0;
    }
    for (const o of orders) {
      const k = o.createdAt.toISOString().split('T')[0];
      if (k in byDay) byDay[k] += Number(o.totalAmount);
    }
    return Object.entries(byDay).map(([date, revenue]) => ({ date, revenue: +revenue.toFixed(2) }));
  }

  async getUserGrowth(weeks = 12) {
    const startDate = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);
    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    });
    const buckets: { weekStart: number; label: string; count: number }[] = [];
    for (let i = 0; i < weeks; i++) {
      const ws = Date.now() - (weeks - i) * 7 * 24 * 60 * 60 * 1000;
      const we = ws + 7 * 24 * 60 * 60 * 1000;
      const label = new Date(ws).toISOString().split('T')[0];
      const count = users.filter(u => u.createdAt.getTime() >= ws && u.createdAt.getTime() < we).length;
      buckets.push({ weekStart: ws, label, count });
    }
    return buckets.map(({ label, count }) => ({ week: label, count }));
  }

  async getTopProducts(limit = 10) {
    const items = await this.prisma.orderItem.groupBy({
      by: ['variantId'],
      _sum: { qty: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: limit,
    });
    const variantIds = items.map(i => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { title: true, tenant: { select: { displayName: true } } } } },
    });
    const vmap = new Map(variants.map(v => [v.id, v]));
    return items.map(i => ({
      variantId: i.variantId,
      qty: i._sum.qty ?? 0,
      productTitle: vmap.get(i.variantId)?.product.title ?? 'Unknown',
      vendorName: vmap.get(i.variantId)?.product.tenant?.displayName ?? 'Unknown',
    }));
  }

  async getCustomerSegments() {
    const [customerCount, ordersPerCustomer] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' as any } }),
      this.prisma.order.groupBy({
        by: ['customerId'],
        _count: { id: true },
        where: { status: { not: 'CANCELLED' as any } },
      }),
    ]);
    const vip = ordersPerCustomer.filter(o => o._count.id >= 3).length;
    const regular = ordersPerCustomer.filter(o => o._count.id >= 1 && o._count.id < 3).length;
    const browsers = Math.max(0, customerCount - ordersPerCustomer.length);
    return [
      { segment: 'Browsers', count: browsers, description: 'Registered, never ordered', color: '#94a3b8' },
      { segment: 'Regular buyers', count: regular, description: '1–2 orders', color: '#818cf8' },
      { segment: 'VIP buyers', count: vip, description: '3+ orders', color: '#7c3aed' },
    ];
  }

  async getOrderStatusBreakdown() {
    const statuses = await this.prisma.order.groupBy({ by: ['status'], _count: { id: true } });
    return statuses.map(s => ({ status: s.status, count: s._count.id }));
  }

  async getRoleBreakdown() {
    const roles = await this.prisma.user.groupBy({ by: ['role'], _count: { id: true } });
    return roles.map(r => ({ role: r.role, count: r._count.id }));
  }

  // ── Platform Settings ─────────────────────────────────────────────────────────

  async getPlatformSettings() {
    return this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    });
  }

  async updatePlatformSettings(dto: Record<string, any>, actorId: string) {
    const settings = await this.prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...dto },
      update: dto,
    });
    await this.audit.log({
      actorId,
      action: 'PLATFORM_SETTINGS_UPDATE',
      targetType: 'PlatformSettings',
      targetId: 'singleton',
      metadata: dto as any,
    });
    return settings;
  }

  // ── Security Monitoring ───────────────────────────────────────────────────────

  async getSecurityOverview() {
    const now = new Date();
    const last1h  = new Date(now.getTime() - 60 * 60 * 1000);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      failedLogins1h,
      failedLogins24h,
      accountLocks24h,
      passwordResets24h,
      suspiciousActions24h,
      recentSecurityEvents,
      totalUsersLocked,
      newUsers24h,
    ] = await Promise.all([
      this.prisma.auditLog.count({ where: { action: 'LOGIN_FAILED', createdAt: { gte: last1h } } }),
      this.prisma.auditLog.count({ where: { action: 'LOGIN_FAILED', createdAt: { gte: last24h } } }),
      this.prisma.auditLog.count({ where: { action: 'ACCOUNT_LOCKED', createdAt: { gte: last24h } } }),
      this.prisma.auditLog.count({ where: { action: 'PASSWORD_RESET', createdAt: { gte: last24h } } }),
      this.prisma.auditLog.count({
        where: {
          action: { in: ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'PASSWORD_RESET', 'ADMIN_USER_UPDATE', 'ADMIN_RESET_PASSWORD'] },
          createdAt: { gte: last24h },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          action: {
            in: [
              'LOGIN_FAILED', 'LOGIN_SUCCESS', 'ACCOUNT_LOCKED', 'PASSWORD_RESET',
              'ADMIN_USER_UPDATE', 'ADMIN_RESET_PASSWORD', 'PLATFORM_SETTINGS_UPDATE',
              'PAYOUT_REQUEST', 'PAYOUT_APPROVE', 'PAYOUT_REJECT',
            ],
          },
          createdAt: { gte: last7d },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { actor: { select: { email: true, role: true } } },
      }),
      this.prisma.user.count({ where: { lockedUntil: { gt: now } } }),
      this.prisma.user.count({ where: { createdAt: { gte: last24h } } }),
    ]);

    // Brute-force targets: emails with 3+ failed logins in last 1h
    const bruteForceTargets = await this.prisma.auditLog.groupBy({
      by: ['targetId'],
      where: { action: 'LOGIN_FAILED', createdAt: { gte: last1h } },
      _count: { id: true },
      having: { id: { _count: { gte: 3 } } },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const systemHealth = await this._checkSystemHealth();

    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (failedLogins1h >= 50 || accountLocks24h >= 10) threatLevel = 'critical';
    else if (failedLogins1h >= 20 || accountLocks24h >= 5) threatLevel = 'high';
    else if (failedLogins1h >= 5 || accountLocks24h >= 1) threatLevel = 'medium';

    return {
      threatLevel,
      summary: {
        failedLogins1h,
        failedLogins24h,
        accountLocks24h,
        passwordResets24h,
        suspiciousActions24h,
        totalUsersLocked,
        newUsers24h,
        bruteForceTargets: bruteForceTargets.map(t => ({
          targetId: t.targetId,
          attempts: t._count.id,
        })),
      },
      systemHealth,
      recentEvents: recentSecurityEvents.map(e => ({
        id: e.id,
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        actorEmail: e.actor?.email ?? 'system',
        actorRole: e.actor?.role ?? 'SYSTEM',
        metadata: e.metadata,
        createdAt: e.createdAt,
        severity: this._getEventSeverity(e.action),
      })),
      generatedAt: now,
    };
  }

  private async _checkSystemHealth() {
    const checks: Record<string, { ok: boolean; latencyMs?: number; detail?: string }> = {};

    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { ok: true, latencyMs: Date.now() - dbStart };
    } catch (e) {
      checks.database = { ok: false, detail: e.message };
    }

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentOrderCount = await this.prisma.order.count({ where: { createdAt: { gte: last24h } } });
    checks.orderProcessing = { ok: true, detail: `${recentOrderCount} orders in last 24h` };

    const pendingPayouts = await this.prisma.payout.count({ where: { status: 'PENDING' } });
    checks.payouts = {
      ok: pendingPayouts < 20,
      detail: `${pendingPayouts} pending payout${pendingPayouts !== 1 ? 's' : ''}`,
    };

    return checks;
  }

  private _getEventSeverity(action: string): 'info' | 'warning' | 'critical' {
    const critical = ['ACCOUNT_LOCKED', 'ADMIN_RESET_PASSWORD', 'PLATFORM_SETTINGS_UPDATE', 'SYSTEM_DISK_WARNING'];
    const warning  = ['LOGIN_FAILED', 'PASSWORD_RESET', 'PAYOUT_APPROVE', 'PAYOUT_REJECT', 'HONEYPOT_HIT', 'TRAP_ROUTE_HIT'];
    if (critical.includes(action)) return 'critical';
    if (warning.includes(action))  return 'warning';
    return 'info';
  }

  async getSecurityEvents(query: {
    page?: number;
    limit?: number;
    action?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const page  = query.page  ?? 1;
    const limit = Math.min(query.limit ?? 30, 100);
    const skip  = (page - 1) * limit;

    const securityActions = [
      'LOGIN_FAILED', 'LOGIN_SUCCESS', 'ACCOUNT_LOCKED', 'PASSWORD_RESET',
      'ADMIN_USER_UPDATE', 'ADMIN_RESET_PASSWORD', 'PLATFORM_SETTINGS_UPDATE',
      'PAYOUT_REQUEST', 'PAYOUT_APPROVE', 'PAYOUT_REJECT',
      'HONEYPOT_HIT', 'TRAP_ROUTE_HIT', 'SYSTEM_DISK_WARNING',
    ];

    const where: any = {
      action: query.action ? { equals: query.action } : { in: securityActions },
    };
    if (query.fromDate) where.createdAt = { ...where.createdAt, gte: new Date(query.fromDate) };
    if (query.toDate)   where.createdAt = { ...where.createdAt, lte: new Date(query.toDate) };

    const [events, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { actor: { select: { email: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: events.map(e => ({
        id: e.id,
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        actorEmail: e.actor?.email ?? 'system',
        actorRole: e.actor?.role ?? 'SYSTEM',
        metadata: e.metadata,
        createdAt: e.createdAt,
        severity: this._getEventSeverity(e.action),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
}
