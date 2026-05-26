import {
  Controller, Post, Get, Patch, Body, Param, Query,
  HttpCode, HttpStatus, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { KargoService } from './kargo.service';
import { CreateShipmentDto } from './dto/kargo.dto';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ApiResponse } from '../common/response.dto';
import { PrismaService } from '../prisma/prisma.service';

class DepotArrivalDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

@ApiTags('Shipping (Kargo)')
@ApiBearerAuth()
@Controller('kargo')
export class KargoController {
  constructor(
    private readonly kargo:  KargoService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Vendor: create shipment for their own order ────────────────────────────

  @Post('shipments')
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER, UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new shipment for an order' })
  async createShipment(
    @Body()         dto:  CreateShipmentDto,
    @CurrentUser() user: any,
  ) {
    // Order items carry the tenantId — get it from there
    const order = await this.prisma.order.findUnique({
      where:   { id: dto.orderId },
      include: { items: { take: 1, select: { tenantId: true } } },
    });
    if (!order) throw new ForbiddenException('Order not found');

    const tenantId = order.items[0]?.tenantId;
    if (!tenantId) throw new ForbiddenException('Order has no items');

    const isAdmin = ([UserRole.PLATFORM_ADMIN, UserRole.GOD_USER] as UserRole[]).includes(user.role);
    if (!isAdmin && tenantId !== user.tenantId) {
      throw new ForbiddenException('This order does not belong to your store');
    }

    const result = await this.kargo.createShipment({
      ...dto,
      tenantId,
    });

    return ApiResponse.ok(result, result.success ? 'Shipment created' : 'Shipment failed');
  }

  // ── Track a shipment ────────────────────────────────────────────────────────

  @Get('track/:trackingNumber')
  @ApiOperation({ summary: 'Track a shipment by tracking number' })
  async trackShipment(
    @Param('trackingNumber') trackingNumber: string,
    @Query('carrier') carrier: string = 'aras',
  ) {
    const result = await this.kargo.trackShipment(trackingNumber, carrier);
    return ApiResponse.ok(result, 'Tracking info');
  }

  // ── Get shipments for an order ─────────────────────────────────────────────

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get all shipments for an order' })
  async orderShipments(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
  ) {
    const order = await this.prisma.order.findUnique({
      where:   { id: orderId },
      include: { items: { take: 1, select: { tenantId: true } } },
    });
    if (!order) throw new ForbiddenException('Order not found');

    const tenantId = order.items[0]?.tenantId;
    const isAdmin = ([UserRole.PLATFORM_ADMIN, UserRole.GOD_USER] as UserRole[]).includes(user.role);
    const isOwner = order.customerId === user.id;
    const isVendor = tenantId === user.tenantId;

    if (!isAdmin && !isOwner && !isVendor) throw new ForbiddenException('Access denied');

    const shipments = await this.kargo.getOrderShipments(orderId);
    return ApiResponse.ok(shipments, 'Shipments');
  }

  // ── Vendor: list their own shipments ───────────────────────────────────────

  @Get('my-shipments')
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @ApiOperation({ summary: 'List shipments for the authenticated vendor\'s tenant' })
  async myShipments(
    @CurrentUser() user: any,
    @Query('page')  page  = '1',
    @Query('limit') limit = '20',
  ) {
    const result = await this.kargo.getTenantShipments(user.tenantId, +page, +limit);
    return ApiResponse.ok(result, 'Shipments');
  }

  // ── Return shipment: get for an order ─────────────────────────────────────

  @Get('return/:orderId')
  @ApiOperation({ summary: 'Get return shipment info for an order' })
  async getReturnShipment(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
  ) {
    const order = await this.prisma.order.findUnique({
      where:   { id: orderId },
      include: { items: { take: 1, select: { tenantId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isAdmin  = ([UserRole.PLATFORM_ADMIN, UserRole.GOD_USER] as UserRole[]).includes(user.role);
    const isOwner  = order.customerId === user.id;
    const isVendor = order.items[0]?.tenantId === user.tenantId;
    if (!isAdmin && !isOwner && !isVendor) throw new ForbiddenException('Access denied');

    const rs = await this.kargo.getReturnShipment(orderId);
    return ApiResponse.ok(rs, 'Return shipment');
  }

  // ── Admin: confirm depot arrival ───────────────────────────────────────────

  @Patch('return/:orderId/arrived')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: mark return shipment as arrived at depot' })
  async confirmDepotArrival(
    @Param('orderId') orderId: string,
    @Body() dto: DepotArrivalDto,
  ) {
    const rs = await this.kargo.confirmDepotArrival(orderId, dto.note);
    return ApiResponse.ok(rs, 'Depot arrival confirmed');
  }

  // ── Admin: list all shipments (platform-wide) ─────────────────────────────

  @Get('admin/all')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @ApiOperation({ summary: 'List all shipments (admin)' })
  async adminAllShipments(
    @Query('tenantId') tenantId?: string,
    @Query('page')     page  = '1',
    @Query('limit')    limit = '20',
  ) {
    if (tenantId) {
      const result = await this.kargo.getTenantShipments(tenantId, +page, +limit);
      return ApiResponse.ok(result, 'Shipments');
    }
    // All tenants
    const skip = (+page - 1) * +limit;
    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({ skip, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.shipment.count(),
    ]);
    return ApiResponse.ok({ items, total, page: +page, limit: +limit }, 'All shipments');
  }
}
