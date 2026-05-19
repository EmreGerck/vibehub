import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QueueService } from '../queue/queue.service';
import { CartService } from '../cart/cart.service';
import { PushService } from '../push/push.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { NotificationType, OrderStatus, UserRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Vendor-allowed status transitions
const VENDOR_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PLACED]:     [OrderStatus.CONFIRMED],
  [OrderStatus.CONFIRMED]:  [OrderStatus.SHIPPED],
};

// Admin-allowed status transitions (any → any except backwards from terminal)
const TERMINAL: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED];

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly push: PushService,
    private readonly notifications: NotificationsService,
  ) {}

  async placeOrder(customerId: string, dto: PlaceOrderDto) {
    const cartItems = await this.cart.getRawEntries(customerId);
    if (cartItems.length === 0) throw new BadRequestException('Cart is empty');

    // Load all variants with their product + tenant commission rate
    const variantIds = cartItems.map((c) => c.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { include: { tenant: true } } },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // Validate every item before touching the DB
    for (const entry of cartItems) {
      const v = variantMap.get(entry.variantId);
      if (!v) throw new BadRequestException(`Variant ${entry.variantId} no longer exists`);
      if (v.product.status !== 'LIVE') throw new BadRequestException(`"${v.product.title}" is no longer available`);
      if (v.product.tenant.status !== 'ACTIVE') throw new BadRequestException(`Store "${v.product.tenant.displayName}" is not active`);
      if (v.stockQty < entry.qty) {
        throw new BadRequestException(
          `Not enough stock for "${v.product.title}" — ${v.stockQty} available, ${entry.qty} requested`,
        );
      }
    }

    // Calculate totals
    let totalAmount = new Decimal(0);
    const lineItems = cartItems.map((entry) => {
      const v = variantMap.get(entry.variantId)!;
      const unitPrice = new Decimal(v.priceOverride ?? v.product.price);
      const commissionRate = new Decimal(v.product.tenant.commissionRate);
      const lineTotal = unitPrice.mul(entry.qty);
      const platformFee = lineTotal.mul(commissionRate);
      const vendorPayout = lineTotal.sub(platformFee);
      totalAmount = totalAmount.add(lineTotal);

      return {
        variantId: entry.variantId,
        tenantId: v.product.tenantId,
        qty: entry.qty,
        unitPriceSnapshot: unitPrice,
        commissionRateSnapshot: commissionRate,
        vendorPayoutAmount: vendorPayout,
        // for stock deduction
        variant: v,
      };
    });

    // Single transaction: create order + items + deduct stock atomically
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerId,
          status: OrderStatus.PLACED,
          totalAmount,
          currency: dto.currency ?? 'USD',
          shippingAddress: dto.shippingAddress as any,
          items: {
            create: lineItems.map(({ variant: _v, ...item }) => item),
          },
        },
        include: {
          items: {
            include: {
              variant: { include: { product: true } },
              tenant: true,
            },
          },
        },
      });

      // Deduct stock for each variant
      for (const item of lineItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQty: { decrement: item.qty } },
        });
      }

      return newOrder;
    });

    // Clear cart and queue confirmation email
    await this.cart.clearCart(customerId);

    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { email: true },
    });
    if (customer) {
      await this.queue.sendMail({
        type: 'ORDER_CONFIRMATION',
        to: customer.email,
        orderId: order.id,
      });
    }

    return order;
  }

  async getMyOrders(customerId: string, query: QueryOrdersDto) {
    const where: any = { customerId };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              variant: {
                include: { product: { select: { id: true, title: true, images: true } } },
              },
              tenant: { select: { id: true, slug: true, displayName: true } },
            },
          },
          shipments: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getOrderById(orderId: string, actor: { id: string; role: UserRole; tenantId: string | null }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: { select: { id: true, title: true, images: true } } },
            },
            tenant: true,
          },
        },
        shipments: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const isAdmin = ([UserRole.PLATFORM_ADMIN, UserRole.GOD_USER] as UserRole[]).includes(actor.role);
    const isOwner = order.customerId === actor.id;
    const isVendorOfItem = actor.tenantId && order.items.some((i) => i.tenantId === actor.tenantId);

    if (!isAdmin && !isOwner && !isVendorOfItem) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async getVendorOrders(tenantId: string, query: QueryOrdersDto) {
    const where: any = { items: { some: { tenantId } } };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            where: { tenantId },
            include: {
              variant: {
                include: { product: { select: { id: true, title: true, images: true } } },
              },
            },
          },
          shipments: { where: { tenantId } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async updateStatusAsVendor(
    orderId: string,
    dto: UpdateOrderStatusDto,
    actor: { id: string; tenantId: string | null; role: UserRole },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    // Vendor must have items in this order
    if (actor.tenantId) {
      const hasItem = await this.prisma.orderItem.findFirst({
        where: { orderId, tenantId: actor.tenantId },
      });
      if (!hasItem) throw new ForbiddenException('No items from your store in this order');
    }

    const allowed = VENDOR_TRANSITIONS[order.status];
    if (!allowed?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${dto.status}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: dto.status },
    });

    await this.audit.log({
      actorId: actor.id,
      action: 'ORDER_STATUS_UPDATED',
      targetType: 'Order',
      targetId: orderId,
      metadata: { from: order.status, to: dto.status, tenantId: actor.tenantId },
    });

    if (dto.status === OrderStatus.SHIPPED) {
      const customer = await this.prisma.user.findUnique({
        where: { id: order.customerId },
        select: { email: true },
      });
      if (customer) {
        await this.queue.sendMail({
          type: 'SHIPMENT_NOTIFICATION',
          to: customer.email,
          orderId: order.id,
          trackingNumber: null,
          carrier: null,
        });
      }
      await this.push.sendToUser(
        order.customerId,
        'Order Shipped',
        'Your order is on its way!',
        { type: 'ORDER_SHIPPED', orderId: order.id },
      );
      await this.notifications.create({
        userId: order.customerId,
        type: NotificationType.ORDER_SHIPPED,
        title: 'Order Shipped',
        body: 'Your order is on its way!',
        data: { orderId: order.id },
      });
    }

    return updated;
  }

  async updateStatusAsAdmin(orderId: string, dto: UpdateOrderStatusDto, actorId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (TERMINAL.includes(order.status)) {
      throw new BadRequestException(`Order is already in terminal status: ${order.status}`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: dto.status },
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_ORDER_STATUS_OVERRIDE',
      targetType: 'Order',
      targetId: orderId,
      metadata: { from: order.status, to: dto.status, reason: dto.reason },
    });

    if (dto.status === OrderStatus.SHIPPED) {
      const customer = await this.prisma.user.findUnique({
        where: { id: order.customerId },
        select: { email: true },
      });
      if (customer) {
        await this.queue.sendMail({
          type: 'SHIPMENT_NOTIFICATION',
          to: customer.email,
          orderId: order.id,
          trackingNumber: null,
          carrier: null,
        });
      }
      await this.push.sendToUser(
        order.customerId,
        'Order Shipped',
        'Your order is on its way!',
        { type: 'ORDER_SHIPPED', orderId: order.id },
      );
      await this.notifications.create({
        userId: order.customerId,
        type: NotificationType.ORDER_SHIPPED,
        title: 'Order Shipped',
        body: 'Your order is on its way!',
        data: { orderId: order.id },
      });
    }

    return updated;
  }

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
          items: {
            include: {
              tenant: { select: { id: true, slug: true, displayName: true } },
              variant: {
                include: { product: { select: { id: true, title: true } } },
              },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async cancelOrder(orderId: string, customerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('Not your order');
    if (!([OrderStatus.PLACED, OrderStatus.CONFIRMED] as OrderStatus[]).includes(order.status)) {
      throw new BadRequestException(`Cannot cancel an order in status: ${order.status}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } });

      // Restore stock
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQty: { increment: item.qty } },
        });
      }
    });

    return { id: orderId, status: OrderStatus.CANCELLED };
  }
}
