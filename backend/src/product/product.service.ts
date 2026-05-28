import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PushService } from '../push/push.service';
import { ProductStatus, UserRole, VendorPermission } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ReviewProductDto, ProductDecision } from './dto/review-product.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly permissions: PermissionsService,
    private readonly push: PushService,
    private readonly search: SearchService,
  ) {}

  // ── Product CRUD ─────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateProductDto, actorId: string) {
    // Inherit the vendor's preferred fulfilment mode by default. Admin can override
    // per-product later (or vendor self-flips if granted PRODUCT_PUBLISH_DIRECT).
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { defaultFulfilment: true },
    });

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        currency: dto.currency ?? 'USD',
        images: dto.images ?? [],
        tags: dto.tags ?? [],
        status: ProductStatus.DRAFT,
        fulfilment: tenant?.defaultFulfilment ?? 'VENDOR_MANAGED',
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.shippingNote !== undefined ? { shippingNote: dto.shippingNote } : {}),
        ...(dto.previewVideoUrl !== undefined ? { previewVideoUrl: dto.previewVideoUrl } : {}),
        ...(dto.attributes !== undefined ? { attributes: dto.attributes as any } : {}),
        ...(dto.sizeChart  !== undefined ? { sizeChart:  dto.sizeChart  as any } : {}),
      },
      include: { variants: true },
    });

    await this.audit.log({
      actorId,
      action: 'PRODUCT_CREATED',
      targetType: 'Product',
      targetId: product.id,
      metadata: { title: product.title, tenantId },
    });

    return product;
  }

  async update(productId: string, dto: UpdateProductDto, actor: { id: string; tenantId: string | null; role: UserRole }) {
    const product = await this.findProductOrThrow(productId);
    this.assertOwnership(product, actor);

    if (product.status === ProductStatus.LIVE || product.status === ProductStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Cannot edit a product that is LIVE or PENDING_REVIEW — archive it first',
      );
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(dto.title           !== undefined && { title:           dto.title }),
        ...(dto.description     !== undefined && { description:     dto.description }),
        ...(dto.price           !== undefined && { price:           dto.price }),
        ...(dto.images          !== undefined && { images:          dto.images }),
        ...(dto.tags            !== undefined && { tags:            dto.tags }),
        ...(dto.previewVideoUrl !== undefined && { previewVideoUrl: dto.previewVideoUrl }),
        ...(dto.categoryId      !== undefined && { categoryId:      dto.categoryId }),
        ...(dto.shippingNote    !== undefined && { shippingNote:    dto.shippingNote }),
        ...(dto.attributes      !== undefined && { attributes:      dto.attributes as any }),
        ...(dto.sizeChart       !== undefined && { sizeChart:       dto.sizeChart  as any }),
      },
      include: { variants: true },
    });
  }

  async submitForReview(productId: string, actor: { id: string; tenantId: string | null; role: UserRole }) {
    const product = await this.findProductOrThrow(productId);
    this.assertOwnership(product, actor);

    if (product.status !== ProductStatus.DRAFT) {
      throw new BadRequestException(`Only DRAFT products can be submitted for review (current: ${product.status})`);
    }

    const variantCount = await this.prisma.productVariant.count({ where: { productId } });
    if (variantCount === 0) {
      throw new BadRequestException('Add at least one variant before submitting for review');
    }

    // Vendors with PRODUCT_PUBLISH_DIRECT skip the review queue and go straight to LIVE.
    const isAdmin = ([UserRole.PLATFORM_ADMIN, UserRole.GOD_USER] as UserRole[]).includes(actor.role);
    let canPublishDirect = isAdmin;
    if (!isAdmin && actor.tenantId) {
      canPublishDirect = await this.permissions.tenantHas(
        actor.tenantId,
        VendorPermission.PRODUCT_PUBLISH_DIRECT,
      );
    }
    const nextStatus = canPublishDirect ? ProductStatus.LIVE : ProductStatus.PENDING_REVIEW;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status: nextStatus },
      include: { variants: true },
    });

    await this.audit.log({
      actorId: actor.id,
      action: canPublishDirect ? 'PRODUCT_PUBLISHED_DIRECT' : 'PRODUCT_SUBMITTED_FOR_REVIEW',
      targetType: 'Product',
      targetId: productId,
    });

    if (nextStatus === ProductStatus.LIVE) {
      await this.notifyFollowersNewDrop(productId, product.tenantId, product.title);
      this.search.indexProduct(productId).catch(() => {});
    }

    return updated;
  }

  async review(productId: string, dto: ReviewProductDto, actorId: string) {
    const product = await this.findProductOrThrow(productId);

    if (product.status !== ProductStatus.PENDING_REVIEW) {
      throw new BadRequestException(`Product is not PENDING_REVIEW (current: ${product.status})`);
    }

    const newStatus = dto.decision === ProductDecision.APPROVE
      ? ProductStatus.LIVE
      : ProductStatus.ARCHIVED;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status: newStatus },
      include: { variants: true },
    });

    await this.audit.log({
      actorId,
      action: `PRODUCT_${dto.decision}`,
      targetType: 'Product',
      targetId: productId,
      metadata: { reason: dto.reason, newStatus },
    });

    if (newStatus === ProductStatus.LIVE) {
      await this.notifyFollowersNewDrop(productId, product.tenantId, product.title);
      this.search.indexProduct(productId).catch(() => {});
    } else {
      // ARCHIVED / REJECTED → remove from search index
      this.search.deleteProduct(productId).catch(() => {});
    }

    return updated;
  }

  async archive(productId: string, actor: { id: string; tenantId: string | null; role: UserRole }) {
    const product = await this.findProductOrThrow(productId);
    this.assertOwnership(product, actor);

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED },
    });

    this.search.deleteProduct(productId).catch(() => {});
    return updated;
  }

  // ── Public browse ─────────────────────────────────────────────────────────────

  private applyTranslations<T extends { translations?: any; title: string; description: string }>(
    item: T,
    lang: string,
  ): T {
    if (lang === 'tr' || !item.translations) return item;
    const t = (item.translations as Record<string, any>)?.[lang];
    if (!t) return item;
    return {
      ...item,
      title: t.title ?? item.title,
      description: t.description ?? item.description,
    };
  }

  async findAll(query: QueryProductsDto, adminView = false, lang = 'tr') {
    const where: any = {};

    if (!adminView) {
      where.status = ProductStatus.LIVE;
      where.tenant = { status: 'ACTIVE' };
    }

    if (query.tenantId) where.tenantId = query.tenantId;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.tags?.length) {
      where.tags = { hasSome: query.tags };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }

    if (query.categoryId) where.categoryId = query.categoryId;

    const orderBy = this.resolveSort(query.sortBy);

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy,
        include: {
          tenant: { select: { id: true, slug: true, displayName: true, logoUrl: true } },
          category: { select: { id: true, name: true, slug: true, icon: true } },
          variants: true,
          _count: { select: { reviews: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Attach avgRating via a single grouped aggregation query
    const productIds = items.map((p) => p.id);
    const ratingAggs = productIds.length
      ? await this.prisma.review.groupBy({
          by: ['productId'],
          where: { productId: { in: productIds } },
          _avg: { rating: true },
        })
      : [];
    const ratingMap = new Map(ratingAggs.map((r) => [r.productId, r._avg.rating]));

    const enriched = items.map((p) => ({
      ...p,
      avgRating: ratingMap.get(p.id) ?? null,
      // Sprint 13 audit: hide profit-share + mfg-unit pointer from non-admin views.
      ...(adminView ? {} : { profitSharePct: undefined, manufacturingUnitId: undefined }),
    }));

    return { items: enriched.map((p) => this.applyTranslations(p, lang)), total, page: query.page, limit: query.limit };
  }

  /** Full-text search via Meilisearch (falls back to Prisma LIKE). */
  async searchProducts(params: {
    query: string;
    tenantId?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    currency?: string;
    sortBy?: 'price_asc' | 'price_desc' | 'newest';
    page?: number;
    limit?: number;
    lang?: string;
  }) {
    const { ids, total, processingTimeMs } = await this.search.search({
      query:      params.query,
      tenantId:   params.tenantId,
      categoryId: params.categoryId,
      minPrice:   params.minPrice,
      maxPrice:   params.maxPrice,
      currency:   params.currency,
      sortBy:     params.sortBy,
      page:       params.page ?? 1,
      limit:      params.limit ?? 20,
    });

    if (ids.length === 0) return { items: [], total, processingTimeMs };

    // Preserve ranking order from Meilisearch
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        tenant:   { select: { id: true, slug: true, displayName: true, logoUrl: true } },
        category: { select: { id: true, name: true, slug: true, icon: true } },
        variants: true,
        _count:   { select: { reviews: true } },
      },
    });

    // Attach avgRating
    const searchRatingAggs = await this.prisma.review.groupBy({
      by: ['productId'],
      where: { productId: { in: ids } },
      _avg: { rating: true },
    });
    const searchRatingMap = new Map(searchRatingAggs.map((r) => [r.productId, r._avg.rating]));

    const lang = params.lang ?? 'tr';
    const ordered = ids
      .map(id => products.find(p => p.id === id))
      .filter(Boolean)
      .map(p => this.applyTranslations({ ...p!, avgRating: searchRatingMap.get(p!.id) ?? null }, lang));

    return { items: ordered, total, processingTimeMs };
  }

  async findOne(productId: string, adminView = false, lang = 'tr') {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        tenant: { select: { id: true, slug: true, displayName: true, logoUrl: true } },
        // Sprint 13 fix: attributeSchema + sizeChartTemplate must flow through
        // so the customer Özellikler panel + Beden Tablosu can render with
        // category-aware labels. Without these, the PDP falls back to raw keys.
        category: {
          select: {
            id: true, name: true, slug: true, icon: true,
            attributeSchema: true, sizeChartTemplate: true,
          },
        },
        variants: true,
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { customer: { select: { id: true, email: true } } },
        },
        _count: { select: { reviews: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    if (!adminView && product.status !== ProductStatus.LIVE) {
      throw new NotFoundException('Product not found');
    }

    // Sprint 13 audit: scrub the internal commercial fields from non-admin
    // responses. profitSharePct = vendor's agreed cut (commercial info).
    // manufacturingUnitId = pointer to the GOD_USER-owned cost catalogue.
    // Both are leaking to anyone hitting GET /products/:id today.
    const scrubbed = adminView
      ? product
      : { ...product, profitSharePct: undefined, manufacturingUnitId: undefined };

    return this.applyTranslations(scrubbed, lang);
  }

  async findByTenant(tenantId: string, query: QueryProductsDto, viewerRole?: UserRole) {
    const isVendor = viewerRole && ([UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER] as UserRole[]).includes(viewerRole);
    const isAdmin  = viewerRole && ([UserRole.PLATFORM_ADMIN, UserRole.GOD_USER] as UserRole[]).includes(viewerRole);
    const where: any = { tenantId };
    if (!isVendor && !isAdmin) where.status = ProductStatus.LIVE;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { variants: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Sprint 13 audit: scrub profitSharePct + manufacturingUnitId for public
    // and vendor-of-different-tenant views. Vendor of THIS tenant can see
    // their own deal; admin sees everything.
    const scrubbed = isAdmin
      ? items
      : items.map((p) => ({ ...p, profitSharePct: undefined, manufacturingUnitId: undefined }));
    return { items: scrubbed, total, page: query.page, limit: query.limit };
  }

  async findPendingReview(query: QueryProductsDto) {
    const where = { status: ProductStatus.PENDING_REVIEW };
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

  // ── Variants ──────────────────────────────────────────────────────────────────

  async createVariant(productId: string, dto: CreateVariantDto, actor: { id: string; tenantId: string | null; role: UserRole }) {
    const product = await this.findProductOrThrow(productId);
    this.assertOwnership(product, actor);

    if (product.status === ProductStatus.LIVE) {
      throw new BadRequestException('Cannot add variants to a LIVE product — archive and re-submit');
    }

    const existing = await this.prisma.productVariant.findUnique({ where: { sku: dto.sku } });
    if (existing) throw new ConflictException(`SKU "${dto.sku}" already exists`);

    return this.prisma.productVariant.create({
      data: {
        productId,
        sku: dto.sku,
        attributes: dto.attributes,
        priceOverride: dto.priceOverride ?? null,
        stockQty: dto.stockQty,
        lowStockThreshold: dto.lowStockThreshold ?? 5,
      },
    });
  }

  async updateVariant(variantId: string, dto: UpdateVariantDto, actor: { id: string; tenantId: string | null; role: UserRole }) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    this.assertOwnership(variant.product, actor);

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: dto,
    });
  }

  async adjustStock(variantId: string, delta: number, actor: { id: string; tenantId: string | null; role: UserRole }) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    this.assertOwnership(variant.product, actor);

    const newQty = variant.stockQty + delta;
    if (newQty < 0) throw new BadRequestException('Stock cannot go below zero');

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stockQty: newQty },
    });
  }

  async deleteVariant(variantId: string, actor: { id: string; tenantId: string | null; role: UserRole }) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    this.assertOwnership(variant.product, actor);

    if (variant.product.status === ProductStatus.LIVE) {
      throw new BadRequestException('Cannot delete a variant from a LIVE product');
    }

    return this.prisma.productVariant.delete({ where: { id: variantId } });
  }

  // ── Push helpers ──────────────────────────────────────────────────────────────

  private async notifyFollowersNewDrop(productId: string, tenantId: string, title: string) {
    const follows = await this.prisma.follow.findMany({
      where: { tenantId },
      select: { userId: true },
    });
    const followerIds = follows.map((f) => f.userId);
    if (followerIds.length === 0) return;
    await this.push.sendToUsers(followerIds, 'New Drop', title, { type: 'NEW_DROP', productId });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private async findProductOrThrow(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private assertOwnership(
    product: { tenantId: string },
    actor: { tenantId: string | null; role: UserRole },
  ) {
    const isAdmin = ([UserRole.PLATFORM_ADMIN, UserRole.GOD_USER] as UserRole[]).includes(actor.role);
    if (!isAdmin && actor.tenantId !== product.tenantId) {
      throw new ForbiddenException('This product does not belong to your store');
    }
  }

  private resolveSort(sortBy?: string) {
    switch (sortBy) {
      case 'price_asc':  return { price: 'asc' as const };
      case 'price_desc': return { price: 'desc' as const };
      case 'oldest':     return { createdAt: 'asc' as const };
      default:           return { createdAt: 'desc' as const };
    }
  }
}
