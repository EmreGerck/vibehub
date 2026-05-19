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
import { AdminCreateProductDto, AdminUpdateProductDto } from './dto/admin-product.dto';
import {
  AdminCreateVariantDto,
  AdminUpdateVariantDto,
  AdminUpdateUserDto,
  AdminResetPasswordDto,
  AdminUpdateTenantDto,
  AdminCancelOrderDto,
  AdminRefundOrderDto,
  AdminQueryReviewsDto,
  AdminUpdateReviewDto,
  AdminCreateVendorDto,
} from './dto/admin-extras.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { OrderStatus, ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly vendor: VendorService,
    private readonly permissions: PermissionsService,
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

  async createBanner(dto: CreateBannerDto) {
    const { tenantId, ...rest } = dto;
    return this.prisma.heroBanner.create({
      data: {
        ...rest,
        translations: rest.translations as any,
        ...(tenantId ? { tenant: { connect: { id: tenantId } } } : {}),
      },
    });
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    const { tenantId, ...rest } = dto;
    return this.prisma.heroBanner.update({
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
  }

  async deleteBanner(id: string) {
    const banner = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    await this.prisma.heroBanner.delete({ where: { id } });
    return { deleted: true };
  }

  async toggleBanner(id: string) {
    const banner = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return this.prisma.heroBanner.update({
      where: { id },
      data: { active: !banner.active },
    });
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

  async adminRefundOrder(orderId: string, dto: AdminRefundOrderDto, actorId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('Order is already refunded');
    }

    const restock = dto.restock ?? false;
    const updated = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REFUNDED },
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
      action: 'ADMIN_ORDER_REFUNDED',
      targetType: 'Order',
      targetId: orderId,
      metadata: {
        reason: dto.reason,
        amount: dto.amount ?? Number(order.totalAmount),
        restock,
        previousStatus: order.status,
      },
    });

    return updated;
  }

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

  async updatePlatformSettings(dto: {
    defaultCommissionRate?: number;
    platformName?: string;
    supportEmail?: string;
    maintenanceMode?: boolean;
    vendorSignupsOpen?: boolean;
    productSubmissionsOpen?: boolean;
    globalForumEnabled?: boolean;
    requirePurchaseReview?: boolean;
  }, actorId: string) {
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
}
