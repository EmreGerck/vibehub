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

    // Calculate totals
    let totalAmount = new Decimal(0);
    const lineItems = cartItems.map((entry) => {
      const v = variantMap.get(entry.variantId)!;
      const unitPrice = new Decimal(v.priceOverride ?? v.product.price);
      if (unitPrice.isNegative()) throw new BadRequestException(`Invalid price for "${v.product.title}"`);
      const commissionRate = new Decimal(v.product.tenant.commissionRate);
      if (commissionRate.isNegative() || commissionRate.greaterThan(new Decimal(1))) {
        throw new BadRequestException(`Invalid commission rate for store "${v.product.tenant.displayName}"`);
      }
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

      // Deduct stock for each variant — skip pre-order items (no stock kept).
      for (const item of lineItems) {
        if (item.isPreOrder) continue;
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

    // Require payment confirmation before vendor can confirm an order
    if (dto.status === OrderStatus.CONFIRMED && !order.paymentRef) {
      throw new BadRequestException('Cannot confirm order: payment has not been received');
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
      if (customer) {
        await this.queue.sendMail({
          type: 'SHIPMENT_NOTIFICATION',
          to: customer.email,
          orderId: order.id,
          trackingNumber: null,
          carrier: null,
        });
      }
      await this.push.sendToUser(order.customerId, 'Siparişiniz Kargoya Verildi', 'Siparişiniz yolda!', { type: 'ORDER_SHIPPED', orderId: order.id });
      await this.notifications.create({ userId: order.customerId, type: NotificationType.ORDER_SHIPPED, title: 'Siparişiniz Kargoya Verildi', body: 'Siparişiniz yolda!', data: { orderId: order.id } });
    }

    if (dto.status === OrderStatus.DELIVERED) {
      if (customer) await this.mail.sendOrderDelivered(customer.email, order.id);
      await this.push.sendToUser(order.customerId, 'Siparişiniz Teslim Edildi', 'Yorum bırakmayı unutmayın!', { type: 'ORDER_DELIVERED', orderId: order.id });
      await this.notifications.create({ userId: order.customerId, type: NotificationType.ORDER_SHIPPED, title: 'Siparişiniz Teslim Edildi', body: 'Yorum bırakarak sanatçıyı destekleyin!', data: { orderId: order.id } });
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
      include: { customer: { select: { email: true, name: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('Not your order');
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        `İade talebi yalnızca teslim edilmiş siparişler için oluşturulabilir (mevcut durum: ${order.status})`,
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

    // Push notification to customer
    await this.push.sendToUser(
      customerId,
      '↩️ İade Talebiniz Alındı',
      `#${orderId.slice(0, 8).toUpperCase()} — İade kargo kodunuz e-posta ile gönderildi.`,
      { url: `/profile/orders/${orderId}` },
    ).catch(() => {});

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
      include: { customer: { select: { email: true, name: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== ('REFUND_REQUESTED' as any)) {
      throw new BadRequestException(`Bu sipariş iade beklemiyor (durum: ${order.status})`);
    }

    const updated: any = await (this.prisma.order.update as any)({
      where: { id: orderId },
      data:  {
        status:     OrderStatus.REFUNDED,
        refundNote: note?.trim() ?? null,
        refundedAt: new Date(),
      },
    });

    // Customer email
    if (order.customer?.email) {
      this.mail.sendRefundApproved(
        order.customer.email,
        orderId,
        Number(order.totalAmount),
        order.currency || 'TRY',
      ).catch(() => {});
    }

    // Push notification
    await this.push.sendToUser(
      order.customerId,
      '✅ İadeniz Onaylandı!',
      `#${orderId.slice(0, 8).toUpperCase()} numaralı siparişinizin iadesi onaylandı. 5-10 iş günü içinde hesabınıza yansıyacak.`,
      { url: `/profile/orders/${orderId}` },
    ).catch(() => {});

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
      '❌ İade Talebi Sonucu',
      `#${orderId.slice(0, 8).toUpperCase()} siparişinizin iade talebi değerlendirilemedi. Detaylar için e-postanızı kontrol edin.`,
      { url: `/profile/orders/${orderId}` },
    ).catch(() => {});

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
