import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QueueService } from '../queue/queue.service';
import { CartService } from '../cart/cart.service';
import { PushService } from '../push/push.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { NotificationType, OrderStatus, UserRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { computeLineSplit } from './line-split';

// Vendor-allowed status transitions
const VENDOR_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PLACED]:     [OrderStatus.CONFIRMED],
  [OrderStatus.CONFIRMED]:  [OrderStatus.SHIPPED],
};

// Admin-allowed status transitions (any → any except backwards from terminal)
// REFUND_REQUESTED is NOT terminal — admin can approve (→ REFUNDED) or reject (→ DELIVERED)
const TERMINAL: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.REFUNDED];

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly push: PushService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  async placeOrder(customerId: string, dto: PlaceOrderDto) {
    const cartItems = await this.cart.getRawEntries(customerId);
    if (cartItems.length === 0) throw new BadRequestException('Cart is empty');

    // Load variants with everything line-split needs: tenant commission (lane 2),
    // category VAT + linked mfg unit (lane 1), and the product fulfilment column
    // that picks which lane to walk.
    const variantIds = cartItems.map((c) => c.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            tenant:            true,
            category:          { select: { vatRate: true } },
            manufacturingUnit: { select: { unitCostTRY: true, active: true } },
          },
        },
      },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // Single-currency enforcement: every product must share the same currency.
    // The cart layer also blocks mixing, but we double-check here in case state
    // got out of sync (e.g., vendor changed product currency after add-to-cart).
    const currencies = new Set(variants.map((v) => v.product.currency));
    if (currencies.size > 1) {
      throw new BadRequestException(
        `Sepetin birden fazla para birimi (${Array.from(currencies).join(', ')}) içeriyor — siparişi tamamlamak için tek para birimine indir.`,
      );
    }
    const cartCurrency = variants[0]?.product?.currency || 'TRY';

    // Validate every item before touching the DB
    for (const entry of cartItems) {
      const v = variantMap.get(entry.variantId);
      if (!v) throw new BadRequestException(`Variant ${entry.variantId} no longer exists`);
      if (v.product.status !== 'LIVE') throw new BadRequestException(`"${v.product.title}" is no longer available`);
      if (v.product.tenant.status !== 'ACTIVE') throw new BadRequestException(`Store "${v.product.tenant.displayName}" is not active`);

      if (v.product.isPreOrder) {
        // Pre-order: skip stock check (units are produced after sale). Validate
        // window + limit instead.
        if (v.product.preOrderEndsAt && new Date(v.product.preOrderEndsAt) < new Date()) {
          throw new BadRequestException(`Pre-order window for "${v.product.title}" has closed`);
        }
        if (v.product.preOrderLimit != null) {
          // Hard cap across all approved/awaiting pre-orders for this product variant
          const taken = await this.prisma.orderItem.aggregate({
            where: {
              variantId: v.id,
              isPreOrder: true,
              preOrderStatus: { in: ['AWAITING_APPROVAL', 'APPROVED', 'PRODUCTION', 'SHIPPED'] },
            },
            _sum: { qty: true },
          });
          const used = taken._sum.qty ?? 0;
          if (used + entry.qty > v.product.preOrderLimit) {
            throw new BadRequestException(
              `Pre-order limit reached for "${v.product.title}" — only ${v.product.preOrderLimit - used} left`,
            );
          }
        }
      } else if (v.stockQty < entry.qty) {
        throw new BadRequestException(
          `Not enough stock for "${v.product.title}" — ${v.stockQty} available, ${entry.qty} requested`,
        );
      }
    }

    // Calculate per-line money split via the single-source-of-truth helper.
    // Lane chosen by Product.fulfilment — VENDOR_MANAGED = flat commission,
    // VIBEHUB_MANAGED = VAT-strip → mfg-cost deduct → profit-share with vendor.
    let totalAmount = new Decimal(0);
    const lineItems = cartItems.map((entry) => {
      const v = variantMap.get(entry.variantId)!;
      const unitPrice = new Decimal(v.priceOverride ?? v.product.price);

      let split;
      try {
        split = computeLineSplit({
          fulfilment:            v.product.fulfilment,
          unitPrice,
          qty:                   entry.qty,
          commissionRate:        new Decimal(v.product.tenant.commissionRate),
          vatRate:               v.product.category?.vatRate
            ? new Decimal(v.product.category.vatRate)
            : undefined,
          manufacturingUnitCost: v.product.manufacturingUnit?.unitCostTRY
            ? new Decimal(v.product.manufacturingUnit.unitCostTRY)
            : null,
          profitSharePct:        v.product.profitSharePct
            ? new Decimal(v.product.profitSharePct)
            : null,
          productTitle:          v.product.title,
          storeName:             v.product.tenant.displayName,
        });
      } catch (err: any) {
        throw new BadRequestException(err.message);
      }

      totalAmount = totalAmount.add(split.lineTotal);

      return {
        variantId: entry.variantId,
        tenantId: v.product.tenantId,
        qty: entry.qty,
        unitPriceSnapshot:      split.unitPriceSnapshot,
        commissionRateSnapshot: split.commissionRateSnapshot,
        vendorPayoutAmount:     split.vendorPayoutAmount,
        fulfilment:             v.product.fulfilment,
        // Stage 2 lane-1 snapshots — undefined for VENDOR_MANAGED (stays NULL in DB).
        ...(split.manufacturingCostSnapshot !== undefined && {
          manufacturingCostSnapshot: split.manufacturingCostSnapshot,
          profitSharePctSnapshot:    split.profitSharePctSnapshot,
          platformShareAmount:       split.platformShareAmount,
        }),
        // Pre-order snapshot — frozen at order time so future product edits
        // don't retroactively change an order's status semantics.
        isPreOrder: v.product.isPreOrder,
        preOrderStatus: v.product.isPreOrder ? ('AWAITING_APPROVAL' as const) : null,
        preOrderShipDate: v.product.isPreOrder ? v.product.preOrderShipDate : null,
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
          // Use the cart's authoritative currency, not whatever the client sent
          currency: cartCurrency,
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

      // Deduct stock for each variant — skip pre-order items (no stock kept).
      // ATOMIC guard: updateMany with stockQty:{ gte: qty } prevents oversell
      // race between two concurrent buyers reading stock then both decrementing.
      for (const item of lineItems) {
        if (item.isPreOrder) continue;
        const result = await tx.productVariant.updateMany({
          where: { id: item.variantId, stockQty: { gte: item.qty } },
          data: { stockQty: { decrement: item.qty } },
        });
        if (result.count === 0) {
          // Another customer drained this variant between validation and decrement
          const v = variantMap.get(item.variantId);
          throw new BadRequestException(
            `Stok yetersiz: "${v?.product?.title ?? 'ürün'}" — başka bir müşteri az önce son adetleri aldı`,
          );
        }
      }

      return newOrder;
    });

    // Clear cart and queue confirmation email
    await this.cart.clearCart(customerId);

    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { email: true, name: true },
    });
    if (customer) {
      await this.queue.sendMail({
        type: 'ORDER_CONFIRMATION',
        to: customer.email,
        orderId: order.id,
      });
    }

    // In-app + push notification so the customer immediately sees the order land
    try {
      await this.notifications.create({
        userId: customerId,
        type: NotificationType.ORDER_SHIPPED, // reused as "order lifecycle" channel
        title: 'Siparişin alındı!',
        body: `Sipariş numaran: ${order.id.slice(0, 8).toUpperCase()}. Ödemen onaylandığında işleme alacağız.`,
        data: { orderId: order.id, kind: 'PLACED' },
      });
      await this.push.sendToUser(
        customerId,
        'Siparişin alındı!',
        `Sipariş #${order.id.slice(0, 8).toUpperCase()}`,
        { type: 'ORDER_PLACED', orderId: order.id },
      );
    } catch (err: any) {
      this.logger.warn(`[order.placeOrder] notification dispatch failed: ${err?.message ?? err}`);
    }

    // Notify ADMIN via email — pull recipient from PlatformSettings.orderNotificationEmail.
    // Fail silently if no setting configured (don't block the order on a missing config).
    try {
      const settings = await this.prisma.platformSettings.findUnique({
        where: { id: 'singleton' },
        select: { orderNotificationEmail: true },
      });
      const adminEmail = settings?.orderNotificationEmail;
      if (adminEmail) {
        const itemList = order.items.map((it: any) => ({
          title: it.variant?.product?.title ?? `Ürün ${it.variantId.slice(0, 8)}`,
          qty: it.qty,
        }));
        // Fire-and-forget — admin notification shouldn't fail the customer's order
        this.mail.sendAdminNewOrder(
          adminEmail,
          order.id,
          customer?.email ?? '',
          (customer as any)?.name ?? null,
          Number(order.totalAmount),
          order.currency,
          order.items.length,
          itemList,
        ).catch((err: any) =>
          this.logger.warn(`[order.placeOrder] admin email failed: ${err?.message ?? err}`),
        );
      }
    } catch (err: any) {
      this.logger.warn(`[order.placeOrder] admin email lookup failed: ${err?.message ?? err}`);
    }

    // Notify each VENDOR whose products are in this order — one email per tenant
    // with only that vendor's slice of the items. Includes lane-1 mfg-cost breakdown
    // so VibeHub-managed vendors see the deduction explicitly. Fire-and-forget;
    // failures must not block the customer's order.
    try {
      const itemsByTenant = new Map<string, Array<{
        title: string;
        qty: number;
        unitPrice: number;
        vendorPayout: number;
        fulfilment: 'VIBEHUB_MANAGED' | 'VENDOR_MANAGED';
        manufacturingCost?: number;
      }>>();
      for (const it of order.items as any[]) {
        const tenantId = it.variant?.product?.tenantId;
        if (!tenantId) continue;
        const slice = itemsByTenant.get(tenantId) ?? [];
        slice.push({
          title:        it.variant?.product?.title ?? `Ürün ${it.variantId.slice(0, 8)}`,
          qty:          it.qty,
          unitPrice:    Number(it.unitPriceSnapshot ?? 0),
          vendorPayout: Number(it.vendorPayoutAmount ?? 0),
          fulfilment:   it.fulfilment ?? 'VENDOR_MANAGED',
          manufacturingCost: it.manufacturingCostSnapshot != null
            ? Number(it.manufacturingCostSnapshot)
            : undefined,
        });
        itemsByTenant.set(tenantId, slice);
      }
      if (itemsByTenant.size > 0) {
        const tenants = await this.prisma.tenant.findMany({
          where: { id: { in: Array.from(itemsByTenant.keys()) } },
          select: {
            id: true,
            displayName: true,
            users: {
              where: { role: 'VENDOR_OWNER' },
              select: { email: true },
              take: 1,
            },
          },
        });
        for (const t of tenants) {
          const ownerEmail = t.users[0]?.email;
          if (!ownerEmail) continue;
          const slice = itemsByTenant.get(t.id)!;
          this.mail.sendVendorNewOrder(
            ownerEmail,
            order.id,
            t.displayName ?? 'Mağazan',
            slice,
            order.currency,
          ).catch((err: any) =>
            this.logger.warn(`[order.placeOrder] vendor email failed (${t.id}): ${err?.message ?? err}`),
          );
        }
      }
    } catch (err: any) {
      this.logger.warn(`[order.placeOrder] vendor email lookup failed: ${err?.message ?? err}`);
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

    // Customer-scope view — strip lane-1 + commission snapshots from every item.
    const scrubbed = items.map((o: any) => ({
      ...o,
      items: o.items.map((it: any) => stripLaneOneSnapshots(it, null)),
    }));

    return { items: scrubbed, total, page: query.page, limit: query.limit };
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

    // Strip the lane-1 + commission snapshots from non-admin responses. Those
    // are internal accounting — customers should never see VibeHub's cut or
    // the vendor's profit share %, and vendors should never see another
    // vendor's mfg cost when an order spans multiple tenants.
    if (!isAdmin) {
      return {
        ...order,
        items: order.items.map((it: any) => stripLaneOneSnapshots(it, actor.tenantId)),
      };
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

    // Vendor view — strip the lane-1 fields they shouldn't see (VibeHub's mfg
    // cost + VibeHub's platform share). Keep their own vendorPayoutAmount and
    // profitSharePctSnapshot — they negotiated those, they should see them.
    const scrubbed = items.map((o: any) => ({
      ...o,
      items: o.items.map((it: any) => stripLaneOneSnapshots(it, tenantId)),
    }));

    return { items: scrubbed, total, page: query.page, limit: query.limit };
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

    // Require payment confirmation before vendor can confirm an order
    if (dto.status === OrderStatus.CONFIRMED && !order.paymentRef) {
      throw new BadRequestException('Cannot confirm order: payment has not been received');
    }

    // Build update payload with lifecycle timestamp
    const updateData: any = { status: dto.status };
    const now = new Date();
    if (dto.status === OrderStatus.CONFIRMED) (updateData as any).confirmedAt = now;
    if (dto.status === OrderStatus.SHIPPED)   (updateData as any).shippedAt = now;
    if (dto.status === OrderStatus.DELIVERED) (updateData as any).deliveredAt = now;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    await this.audit.log({
      actorId: actor.id,
      action: 'ORDER_STATUS_UPDATED',
      targetType: 'Order',
      targetId: orderId,
      metadata: { from: order.status, to: dto.status, tenantId: actor.tenantId },
    });

    const customer = await this.prisma.user.findUnique({
      where: { id: order.customerId },
      select: { email: true },
    });

    if (dto.status === OrderStatus.CONFIRMED) {
      if (customer) await this.mail.sendOrderConfirmed(customer.email, order.id);
      await this.push.sendToUser(order.customerId, 'Siparişiniz Onaylandı', 'Siparişiniz hazırlanmaya başlandı.', { type: 'ORDER_CONFIRMED', orderId: order.id });
      await this.notifications.create({ userId: order.customerId, type: NotificationType.ORDER_SHIPPED, title: 'Siparişiniz Onaylandı', body: 'Siparişiniz hazırlanmaya başlandı.', data: { orderId: order.id } });
    }

    if (dto.status === OrderStatus.SHIPPED) {
      // Find the most recent shipment for this order to pull the real tracking number.
      // If no shipment exists, the customer would have received a useless null tracking
      // notification — so we use a friendly placeholder + tell the vendor to create one.
      const shipment = await this.prisma.shipment.findFirst({
        where: { orderId: order.id },
        orderBy: { createdAt: 'desc' },
      });

      if (customer) {
        await this.queue.sendMail({
          type: 'SHIPMENT_NOTIFICATION',
          to: customer.email,
          orderId: order.id,
          trackingNumber: shipment?.trackingNumber ?? null,
          carrier: shipment?.carrier ?? null,
        });
      }
      await this.push.sendToUser(
        order.customerId,
        'Siparişin yola çıktı! 📦',
        shipment?.trackingNumber
          ? `Takip: ${shipment.trackingNumber} (${shipment.carrier})`
          : 'Siparişin yolda!',
        { type: 'ORDER_SHIPPED', orderId: order.id, trackingNumber: shipment?.trackingNumber, carrier: shipment?.carrier },
      );
      await this.notifications.create({
        userId: order.customerId,
        type: NotificationType.ORDER_SHIPPED,
        title: 'Siparişin yola çıktı! 📦',
        body: shipment?.trackingNumber
          ? `${shipment.carrier?.toUpperCase()} - Takip: ${shipment.trackingNumber}`
          : 'Siparişin kargoya verildi.',
        data: { orderId: order.id, trackingNumber: shipment?.trackingNumber, carrier: shipment?.carrier, kind: 'SHIPPED' },
      });
    }

    if (dto.status === OrderStatus.DELIVERED) {
      if (customer) await this.mail.sendOrderDelivered(customer.email, order.id);
      await this.push.sendToUser(
        order.customerId,
        'Siparişin teslim edildi! 🎉',
        'Beğendiysen sanatçıya yıldız bırak — desteğin çok değerli',
        { type: 'ORDER_DELIVERED', orderId: order.id },
      );
      await this.notifications.create({
        userId: order.customerId,
        type: NotificationType.ORDER_SHIPPED,
        title: 'Siparişin teslim edildi! 🎉',
        body: 'Yorum bırakarak sanatçıyı destekleyebilirsin.',
        data: { orderId: order.id, kind: 'DELIVERED' },
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

    // Build update payload with lifecycle timestamp
    const adminUpdateData: any = { status: dto.status };
    const adminNow = new Date();
    if (dto.status === OrderStatus.CONFIRMED) (adminUpdateData as any).confirmedAt = adminNow;
    if (dto.status === OrderStatus.SHIPPED)   (adminUpdateData as any).shippedAt = adminNow;
    if (dto.status === OrderStatus.DELIVERED) (adminUpdateData as any).deliveredAt = adminNow;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: adminUpdateData,
    });

    await this.audit.log({
      actorId,
      action: 'ADMIN_ORDER_STATUS_OVERRIDE',
      targetType: 'Order',
      targetId: orderId,
      metadata: { from: order.status, to: dto.status, reason: dto.reason },
    });

    const adminCustomer = await this.prisma.user.findUnique({
      where: { id: order.customerId },
      select: { email: true },
    });

    if (dto.status === OrderStatus.CONFIRMED) {
      if (adminCustomer) await this.mail.sendOrderConfirmed(adminCustomer.email, order.id);
      await this.push.sendToUser(order.customerId, 'Siparişiniz Onaylandı', 'Siparişiniz hazırlanmaya başlandı.', { type: 'ORDER_CONFIRMED', orderId: order.id });
      await this.notifications.create({ userId: order.customerId, type: NotificationType.ORDER_SHIPPED, title: 'Siparişiniz Onaylandı', body: 'Siparişiniz hazırlanmaya başlandı.', data: { orderId: order.id } });
    }

    if (dto.status === OrderStatus.SHIPPED) {
      if (adminCustomer) {
        await this.queue.sendMail({
          type: 'SHIPMENT_NOTIFICATION',
          to: adminCustomer.email,
          orderId: order.id,
          trackingNumber: null,
          carrier: null,
        });
      }
      await this.push.sendToUser(order.customerId, 'Siparişiniz Kargoya Verildi', 'Siparişiniz yolda!', { type: 'ORDER_SHIPPED', orderId: order.id });
      await this.notifications.create({ userId: order.customerId, type: NotificationType.ORDER_SHIPPED, title: 'Siparişiniz Kargoya Verildi', body: 'Siparişiniz yolda!', data: { orderId: order.id } });
    }

    if (dto.status === OrderStatus.DELIVERED) {
      if (adminCustomer) await this.mail.sendOrderDelivered(adminCustomer.email, order.id);
      await this.push.sendToUser(order.customerId, 'Siparişiniz Teslim Edildi', 'Yorum bırakmayı unutmayın!', { type: 'ORDER_DELIVERED', orderId: order.id });
      await this.notifications.create({ userId: order.customerId, type: NotificationType.ORDER_SHIPPED, title: 'Siparişiniz Teslim Edildi', body: 'Yorum bırakarak sanatçıyı destekleyin!', data: { orderId: order.id } });
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

  /**
   * Pre-order cancel — customer-initiated cancellation of pre-order items.
   * Unlike a regular cancel, pre-order items don't have real stock to restore.
   * Instead we decrement the pre-order count and mark items as CANCELLED.
   *
   * Allowed while order is PLACED or CONFIRMED and has at least one pre-order item.
   * The customer can cancel before the pre-order ships (status != SHIPPED/DELIVERED).
   */
  async cancelPreOrder(orderId: string, customerId: string) {
    const order = await this.prisma.order.findUnique({
      where:   { id: orderId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('Not your order');

    const preOrderItems = order.items.filter((i) => i.isPreOrder);
    if (preOrderItems.length === 0) {
      throw new BadRequestException('This order has no pre-order items');
    }

    // Only allow cancel before shipment
    const nonCancellableStatuses: OrderStatus[] = [
      OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED,
    ];
    if (nonCancellableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Pre-order cannot be cancelled — order is already ${order.status}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Mark order cancelled
      await tx.order.update({
        where: { id: orderId },
        data:  { status: OrderStatus.CANCELLED },
      });

      // For regular (non-pre-order) items in the same order, restore stock
      const regularItems = order.items.filter((i) => !i.isPreOrder);
      for (const item of regularItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data:  { stockQty: { increment: item.qty } },
        });
      }
      // Pre-order items: no stock to restore — the vendor hadn't reserved physical stock
    });

    // Audit
    await this.audit.log({
      actorId:    customerId,
      action:     'PRE_ORDER_CANCELLED',
      targetType: 'Order',
      targetId:   orderId,
      metadata:   {
        preOrderItemCount: preOrderItems.length,
        products:          preOrderItems.map((i) => i.variant?.product?.title).filter(Boolean),
      },
    });

    // NOTE: real payment refund (Iyzico) goes here when keys are live.
    // For now log the obligation — admin manually refunds in Iyzico panel.
    // Customer gets push so they know the cancel was registered.
    if (order.paymentRef) {
      this.logger.warn(
        `[PRE-ORDER-CANCEL] Order ${orderId} cancelled — manual payment refund required in Iyzico panel (ref: ${order.paymentRef})`,
      );
    }

    // Notify customer
    try {
      await this.notifications.create({
        userId: customerId,
        type: NotificationType.ORDER_SHIPPED,
        title: '🚫 Ön sipariş iptal edildi',
        body: order.paymentRef
          ? 'Para iaden 5-10 iş günü içinde hesabına yansıyacak.'
          : 'Siparişin iptal edildi.',
        data: { orderId, kind: 'PREORDER_CANCELLED' },
      });
      await this.push.sendToUser(
        customerId,
        '🚫 Ön sipariş iptal edildi',
        order.paymentRef ? 'Para iaden 5-10 iş günü içinde dönecek' : 'Siparişin iptal edildi',
        { url: `/profile/orders/${orderId}`, type: 'PREORDER_CANCELLED', orderId },
      );
    } catch (err: any) {
      this.logger.warn(`[cancelPreOrder] notification dispatch failed: ${err?.message ?? err}`);
    }

    return { id: orderId, status: OrderStatus.CANCELLED, preOrderItemsCancelled: preOrderItems.length };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Refund flow
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Customer initiates a refund request on a DELIVERED order.
   * Allowed within 14 calendar days of delivery (Mesafeli Satış Yönetmeliği).
   * Transition: DELIVERED → REFUND_REQUESTED
   */
  async requestRefund(orderId: string, customerId: string, reason: string): Promise<any> {
    const order: any = await this.prisma.order.findUnique({
      where:   { id: orderId },
      include: {
        customer: { select: { email: true, name: true } },
        // Sprint 13 audit fix: the vendor-notify branch below iterates
        // `order.items` to fan out per-tenant emails. Previously items
        // weren't loaded so the entire vendor notification was dead code.
        items: {
          include: { variant: { include: { product: { select: { tenantId: true } } } } },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('Not your order');
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        `İade talebi yalnızca teslim edilmiş siparişler için oluşturulabilir (mevcut durum: ${order.status})`,
      );
    }
    // 14-day cayma hakkı (Mesafeli Satış Yönetmeliği m.18, 6502 Sayılı Kanun)
    // Customer can request refund only within 14 calendar days of delivery.
    if (order.deliveredAt) {
      const deliveredAt = new Date(order.deliveredAt);
      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
      const daysSinceDelivery = (Date.now() - deliveredAt.getTime()) / (24 * 60 * 60 * 1000);
      if (Date.now() - deliveredAt.getTime() > fourteenDaysMs) {
        throw new BadRequestException(
          `14 günlük cayma hakkı süresi geçti (teslimat üzerinden ${Math.floor(daysSinceDelivery)} gün geçmiş). Yasal iade hakkın doldu.`,
        );
      }
    }
    // Block repeated requests: if a prior request was rejected, allow 1 retry max.
    // refundNote being set means admin already rejected once.
    if (order.refundNote && order.refundRequestedAt) {
      throw new BadRequestException(
        'Bu sipariş için iade talebin daha önce değerlendirildi. Tekrar talep oluşturamazsın — destek için iletişime geç.',
      );
    }
    if (!reason?.trim()) {
      throw new BadRequestException('İade nedeni boş bırakılamaz');
    }
    if (reason.length > 1000) {
      throw new BadRequestException('İade nedeni en fazla 1000 karakter olabilir');
    }

    const updated: any = await (this.prisma.order.update as any)({
      where: { id: orderId },
      data:  {
        status:            'REFUND_REQUESTED' as any,   // enum value added in migration; types update post-generate
        refundReason:      reason.trim(),
        refundRequestedAt: new Date(),
        refundNote:        null, // clear any previous note
        refundedAt:        null,
      },
    });

    // Generate return barcode (idempotent: no-op if one already exists)
    let returnBarcode: string | null = null;
    try {
      const existingReturn = await (this.prisma as any).returnShipment.findUnique({ where: { orderId } });
      if (existingReturn) {
        returnBarcode = existingReturn.returnBarcode;
      } else {
        returnBarcode = `VH-RET-${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('')}`;
        await (this.prisma as any).returnShipment.create({
          data: { orderId, returnBarcode, carrier: 'aras' },
        });
      }
    } catch (err: any) {
      // Non-fatal: proceed without barcode if DB hasn't been migrated yet
      this.logger.warn?.(`[Order] Could not create return shipment: ${err.message}`);
    }

    // Notify customer
    if (order.customer?.email) {
      this.mail.sendRefundRequested(order.customer.email, orderId, reason.trim()).catch(() => {});
      if (returnBarcode) {
        this.mail.sendReturnBarcode(order.customer.email, orderId, returnBarcode, 'aras').catch(() => {});
      }
    }

    // Notify vendor(s) whose products were in this order — informational only.
    // Refund decisions are platform-admin gated; vendors just need awareness so
    // they can reach out to the customer if they choose to.
    try {
      const tenantIds = new Set<string>();
      for (const it of (order.items ?? []) as any[]) {
        const tid = it.variant?.product?.tenantId;
        if (tid) tenantIds.add(tid);
      }
      if (tenantIds.size > 0) {
        const tenants = await this.prisma.tenant.findMany({
          where: { id: { in: Array.from(tenantIds) } },
          select: {
            id: true,
            displayName: true,
            users: { where: { role: 'VENDOR_OWNER' }, select: { email: true }, take: 1 },
          },
        });
        const customerName = (order.customer as any)?.name ?? order.customer?.email ?? 'Müşteri';
        for (const t of tenants) {
          const ownerEmail = t.users[0]?.email;
          if (!ownerEmail) continue;
          this.mail.sendVendorRefundRequest(
            ownerEmail,
            orderId,
            t.displayName ?? 'Mağazan',
            customerName,
            reason.trim(),
          ).catch((err: any) =>
            this.logger.warn?.(`[Order] vendor refund email failed (${t.id}): ${err?.message ?? err}`),
          );
        }
      }
    } catch (err: any) {
      this.logger.warn?.(`[Order] vendor refund email lookup failed: ${err?.message ?? err}`);
    }

    // Push notification to customer
    await this.push.sendToUser(
      customerId,
      '↩️ İade talebin alındı',
      returnBarcode
        ? `Kargo kodun hazır: ${returnBarcode}. E-postandan detayları gör.`
        : `#${orderId.slice(0, 8).toUpperCase()} — İade kargo kodunu e-postanda bulabilirsin.`,
      { url: `/profile/orders/${orderId}`, type: 'REFUND_REQUESTED', orderId, returnBarcode },
    ).catch(() => {});

    // In-app notification (bell badge)
    await this.notifications.create({
      userId: customerId,
      type: NotificationType.ORDER_SHIPPED,
      title: '↩️ İade talebin alındı',
      body: returnBarcode
        ? `Kargo kodun: ${returnBarcode}. Aras şubesine bırakabilirsin.`
        : 'İade kargo kodun e-postana gönderildi.',
      data: { orderId, returnBarcode, kind: 'REFUND_REQUESTED' },
    }).catch(() => {});

    await this.audit.log({
      actorId:    customerId,
      action:     'REFUND_REQUESTED',
      targetType: 'Order',
      targetId:   orderId,
      metadata:   { reason: reason.slice(0, 200), returnBarcode },
    });

    return { ...updated, returnBarcode };
  }

  /**
   * Admin approves refund request.
   * Transition: REFUND_REQUESTED → REFUNDED
   * Triggers: iyzico mock refund + customer email + push notification
   */
  async approveRefund(orderId: string, adminId: string, note?: string): Promise<any> {
    const order: any = await this.prisma.order.findUnique({
      where:   { id: orderId },
      include: {
        customer: { select: { email: true, name: true } },
        items: { select: { variantId: true, qty: true, isPreOrder: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== ('REFUND_REQUESTED' as any)) {
      throw new BadRequestException(`Bu sipariş iade beklemiyor (durum: ${order.status})`);
    }

    // Single transaction: flip status + restock non-pre-order items.
    // Stock restoration is critical for accurate inventory; otherwise refunded
    // products silently vanish from sellable stock and vendor sees less inventory
    // than they actually have.
    const updated: any = await this.prisma.$transaction(async (tx: any) => {
      const o = await tx.order.update({
        where: { id: orderId },
        data:  {
          status:     OrderStatus.REFUNDED,
          refundNote: note?.trim() ?? null,
          refundedAt: new Date(),
        },
      });
      // Restock physical items (pre-orders never had stock to begin with)
      for (const item of order.items) {
        if (item.isPreOrder) continue;
        await tx.productVariant.update({
          where: { id: item.variantId },
          data:  { stockQty: { increment: item.qty } },
        });
      }
      return o;
    });

    // NOTE: real payment refund (Iyzico) integration goes here when keys live.
    // For now: status flips + customer is notified. Admin manually triggers the
    // refund in the Iyzico panel. When real Iyzico integration is wired, replace
    // the comment below with `await this.iyzico.refundPayment(order.paymentRef, order.totalAmount)`
    // INSIDE the transaction above, and roll back on failure.
    this.logger.warn(
      `[REFUND] Order ${orderId} marked REFUNDED — manual payment refund still required in Iyzico panel`,
    );

    // Customer email
    if (order.customer?.email) {
      this.mail.sendRefundApproved(
        order.customer.email,
        orderId,
        Number(order.totalAmount),
        order.currency || 'TRY',
      ).catch(() => {});
    }

    // Push notification — friendlier money-back messaging
    const amountText = `${Number(order.totalAmount).toFixed(2)} ${order.currency || 'TRY'}`;
    await this.push.sendToUser(
      order.customerId,
      '✅ İaden onaylandı!',
      `${amountText} — 5-10 iş günü içinde hesabına yansıyacak.`,
      { url: `/profile/orders/${orderId}`, type: 'REFUND_APPROVED', orderId },
    ).catch(() => {});

    // In-app notification (bell badge)
    await this.notifications.create({
      userId: order.customerId,
      type: NotificationType.ORDER_SHIPPED,
      title: '✅ İaden onaylandı!',
      body: `${amountText} tutarındaki iaden 5-10 iş günü içinde ödeme yöntemine yansıyacak.`,
      data: { orderId, amount: order.totalAmount, currency: order.currency, kind: 'REFUND_APPROVED' },
    }).catch(() => {});

    // Mark return shipment as completed
    try {
      await (this.prisma as any).returnShipment.updateMany({
        where: { orderId },
        data:  { status: 'COMPLETED' },
      });
    } catch { /* non-fatal if table not yet migrated */ }

    await this.audit.log({
      actorId:    adminId,
      action:     'REFUND_APPROVED',
      targetType: 'Order',
      targetId:   orderId,
      metadata:   { note, amount: order.totalAmount },
    });

    return updated;
  }

  /**
   * Admin rejects refund request — order returns to DELIVERED.
   * Customer is notified with admin's reason.
   */
  async rejectRefund(orderId: string, adminId: string, note: string): Promise<any> {
    if (!note?.trim()) throw new BadRequestException('Reddetme gerekçesi boş bırakılamaz');

    const order: any = await this.prisma.order.findUnique({
      where:   { id: orderId },
      include: { customer: { select: { email: true, name: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== ('REFUND_REQUESTED' as any)) {
      throw new BadRequestException(`Bu sipariş iade beklemiyor (durum: ${order.status})`);
    }

    const updated: any = await (this.prisma.order.update as any)({
      where: { id: orderId },
      data:  {
        status:     OrderStatus.DELIVERED,   // revert to DELIVERED
        refundNote: note.trim(),
        // keep refundReason + refundRequestedAt for audit trail
      },
    });

    // Customer email
    if (order.customer?.email) {
      this.mail.sendRefundRejected(order.customer.email, orderId, note.trim()).catch(() => {});
    }

    // Push notification
    await this.push.sendToUser(
      order.customerId,
      '❌ İade talebin değerlendirildi',
      'Detaylı açıklama için e-postanı kontrol et veya sipariş sayfanı aç.',
      { url: `/profile/orders/${orderId}`, type: 'REFUND_REJECTED', orderId },
    ).catch(() => {});

    // In-app notification
    await this.notifications.create({
      userId: order.customerId,
      type: NotificationType.ORDER_SHIPPED,
      title: '❌ İade talebin değerlendirildi',
      body: note.length > 100 ? note.slice(0, 100) + '…' : note,
      data: { orderId, kind: 'REFUND_REJECTED', adminNote: note },
    }).catch(() => {});

    await this.audit.log({
      actorId:    adminId,
      action:     'REFUND_REJECTED',
      targetType: 'Order',
      targetId:   orderId,
      metadata:   { note: note.slice(0, 200) },
    });

    return updated;
  }
}

/**
 * Strip lane-1 + commission snapshots from an OrderItem before returning it
 * to a non-admin consumer.
 *
 * Customer view (viewerTenantId === null): no money breakdown at all —
 *   they paid the gross price; the split between vendor and platform is
 *   internal accounting.
 *
 * Vendor view (viewerTenantId === item.tenantId): keep their own
 *   vendorPayoutAmount + profitSharePctSnapshot (they agreed to those);
 *   strip manufacturingCostSnapshot + platformShareAmount + commissionRateSnapshot
 *   (those are VibeHub's internals — vendor knows the deal terms but not the
 *   per-line internal cost or platform's keep).
 *
 * Admin view: never call this — return the row verbatim.
 */
function stripLaneOneSnapshots(item: any, viewerTenantId: string | null): any {
  const isOwnVendor = viewerTenantId !== null && item.tenantId === viewerTenantId;
  const out = { ...item };
  delete out.commissionRateSnapshot;
  delete out.manufacturingCostSnapshot;
  delete out.platformShareAmount;
  if (!isOwnVendor) {
    delete out.vendorPayoutAmount;
    delete out.profitSharePctSnapshot;
  }
  return out;
}
