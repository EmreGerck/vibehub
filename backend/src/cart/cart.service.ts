import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart-item.dto';
import Redis from 'ioredis';

export interface CartEntry {
  variantId: string;
  qty: number;
}

export interface EnrichedCartItem extends CartEntry {
  tenantId: string;
  tenantDisplayName: string;
  product: {
    id: string;
    title: string;
    images: string[];
  };
  variant: {
    sku: string;
    attributes: Record<string, any>;
    priceOverride: number | null;
    stockQty: number;
    price: number;
  };
  lineTotal: number;
}

@Injectable()
export class CartService {
  private readonly redis: Redis;
  private readonly TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const tls = this.config.get('REDIS_TLS') === 'true';
    this.redis = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD'),
      ...(tls ? { tls: {} } : {}),
    });
  }

  private key(userId: string) {
    return `cart:${userId}`;
  }

  private async readEntries(userId: string): Promise<CartEntry[]> {
    const raw = await this.redis.get(this.key(userId));
    if (!raw) return [];
    return JSON.parse(raw);
  }

  private async writeEntries(userId: string, entries: CartEntry[]) {
    if (entries.length === 0) {
      await this.redis.del(this.key(userId));
    } else {
      await this.redis.set(this.key(userId), JSON.stringify(entries), 'EX', this.TTL_SECONDS);
    }
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<EnrichedCartItem[]> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { product: { include: { tenant: true } } },
    });

    if (!variant) throw new NotFoundException('Variant not found');
    if (dto.qty < 1) throw new BadRequestException('Quantity must be at least 1');
    if (variant.product.status !== 'LIVE') throw new BadRequestException('Product is not available');
    if (variant.product.tenant.status !== 'ACTIVE') throw new BadRequestException('Store is not active');

    // Pre-order products are sold based on the time window, not inventory.
    // Only enforce stock checks for regular (non-pre-order) products.
    const isPreOrder = variant.product.preOrderEndsAt !== null && variant.product.preOrderEndsAt !== undefined;
    if (!isPreOrder && variant.stockQty < dto.qty) {
      throw new BadRequestException(`Only ${variant.stockQty} in stock`);
    }

    const entries = await this.readEntries(userId);
    const existing = entries.find((e) => e.variantId === dto.variantId);

    if (existing) {
      const newQty = existing.qty + dto.qty;
      if (!isPreOrder && newQty > variant.stockQty) {
        throw new BadRequestException(`Cannot add more — only ${variant.stockQty} available`);
      }
      existing.qty = newQty;
    } else {
      entries.push({ variantId: dto.variantId, qty: dto.qty });
    }

    await this.writeEntries(userId, entries);
    return this.enrichCart(entries);
  }

  async updateItem(userId: string, variantId: string, dto: UpdateCartItemDto): Promise<EnrichedCartItem[]> {
    const entries = await this.readEntries(userId);

    if (dto.qty === 0) {
      const filtered = entries.filter((e) => e.variantId !== variantId);
      await this.writeEntries(userId, filtered);
      return this.enrichCart(filtered);
    }

    const entry = entries.find((e) => e.variantId === variantId);
    if (!entry) throw new NotFoundException('Item not in cart');

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { preOrderEndsAt: true } } },
    });
    if (!variant) throw new NotFoundException('Variant no longer exists');
    const isPreOrder = variant.product.preOrderEndsAt !== null && variant.product.preOrderEndsAt !== undefined;
    if (!isPreOrder && dto.qty > variant.stockQty) {
      throw new BadRequestException(`Only ${variant.stockQty} available`);
    }

    entry.qty = dto.qty;
    await this.writeEntries(userId, entries);
    return this.enrichCart(entries);
  }

  async removeItem(userId: string, variantId: string): Promise<EnrichedCartItem[]> {
    const entries = await this.readEntries(userId);
    const filtered = entries.filter((e) => e.variantId !== variantId);
    await this.writeEntries(userId, filtered);
    return this.enrichCart(filtered);
  }

  async getCart(userId: string): Promise<EnrichedCartItem[]> {
    const entries = await this.readEntries(userId);
    return this.enrichCart(entries);
  }

  async clearCart(userId: string): Promise<void> {
    await this.redis.del(this.key(userId));
  }

  async getRawEntries(userId: string): Promise<CartEntry[]> {
    return this.readEntries(userId);
  }

  private async enrichCart(entries: CartEntry[]): Promise<EnrichedCartItem[]> {
    if (entries.length === 0) return [];

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: entries.map((e) => e.variantId) } },
      include: { product: { include: { tenant: true } } },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const result: EnrichedCartItem[] = [];

    for (const entry of entries) {
      const v = variantMap.get(entry.variantId);
      if (!v) continue; // variant deleted since added to cart — silently skip

      const unitPrice = Number(v.priceOverride ?? v.product.price);
      result.push({
        variantId: entry.variantId,
        qty: entry.qty,
        tenantId: v.product.tenantId,
        tenantDisplayName: v.product.tenant.displayName,
        product: {
          id: v.product.id,
          title: v.product.title,
          images: v.product.images,
        },
        variant: {
          sku: v.sku,
          attributes: v.attributes as Record<string, any>,
          priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
          stockQty: v.stockQty,
          price: Number(v.product.price),
        },
        lineTotal: unitPrice * entry.qty,
      });
    }

    return result;
  }
}
