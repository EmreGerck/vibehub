import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus } from '@prisma/client';

const PRODUCT_INCLUDE = {
  tenant: { select: { id: true, slug: true, displayName: true, logoUrl: true } },
} as const;

function toFeedItem(p: any) {
  return {
    id: `product-${p.id}`,
    type: 'new_product' as const,
    vendor: {
      id: p.tenant.id,
      slug: p.tenant.slug,
      name: p.tenant.displayName,
      logoUrl: p.tenant.logoUrl ?? null,
    },
    title: p.title,
    imageUrl: p.images?.[0] ?? null,
    productId: p.id,
    createdAt: p.createdAt.toISOString(),
  };
}

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(userId: string, page = 1, limit = 20) {
    const follows = await this.prisma.follow.findMany({
      where: { userId },
      select: { tenantId: true },
    });
    const tenantIds = follows.map((f) => f.tenantId);

    if (tenantIds.length === 0) {
      return this.getTrending(page, limit);
    }

    const skip = (page - 1) * limit;
    const where = { tenantId: { in: tenantIds }, status: ProductStatus.LIVE };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map(toFeedItem),
      total,
      page,
      limit,
      hasMore: skip + products.length < total,
    };
  }

  private async getTrending(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { status: ProductStatus.LIVE };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map(toFeedItem),
      total,
      page,
      limit,
      hasMore: skip + products.length < total,
    };
  }
}
