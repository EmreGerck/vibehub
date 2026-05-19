import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async toggle(userId: string, productId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.wishlist.delete({ where: { id: existing.id } });
      return { added: false };
    }

    await this.prisma.wishlist.create({ data: { userId, productId } });
    return { added: true };
  }

  async list(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            tenant: { select: { id: true, slug: true, displayName: true } },
            variants: { take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { items: items.map((w) => w.product), total: items.length };
  }

  async check(userId: string, productId: string) {
    const item = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return { wishlisted: !!item };
  }

  async checkMany(userId: string, productIds: string[]) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId, productId: { in: productIds } },
      select: { productId: true },
    });
    const set = new Set(items.map((i) => i.productId));
    return Object.fromEntries(productIds.map((id) => [id, set.has(id)]));
  }
}
