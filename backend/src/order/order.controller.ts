import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { OrderService } from './order.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiResponse } from '../common/response.dto';
import { RequirePermissions } from '../permissions/permissions.decorator';
import { VendorPermission } from '@prisma/client';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ── Customer ──────────────────────────────────────────────────────────────────

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post()
  @ApiOperation({ summary: 'Place an order from the current cart' })
  async placeOrder(@Body() dto: PlaceOrderDto, @CurrentUser() user: any) {
    const order = await this.orderService.placeOrder(user.id, dto);
    return ApiResponse.ok(order, 'Order placed successfully');
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current customer order history' })
  async getMyOrders(@Query() query: QueryOrdersDto, @CurrentUser() user: any) {
    const result = await this.orderService.getMyOrders(user.id, query);
    return ApiResponse.ok(result, 'Orders retrieved');
  }

  @Get('my/:id')
  @ApiOperation({ summary: 'Get a specific order (customer view)' })
  async getMyOrder(@Param('id') id: string, @CurrentUser() user: any) {
    const order = await this.orderService.getOrderById(id, user);
    return ApiResponse.ok(order, 'Order retrieved');
  }

  @Patch('my/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order (only PLACED or CONFIRMED)' })
  async cancelOrder(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.orderService.cancelOrder(id, user.id);
    return ApiResponse.ok(result, 'Order cancelled');
  }

  // ── Vendor ────────────────────────────────────────────────────────────────────

  @Get('vendor')
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.ORDER_VIEW)
  @ApiOperation({ summary: "Get orders containing vendor's items" })
  async getVendorOrders(@Query() query: QueryOrdersDto, @CurrentUser() user: any) {
    const result = await this.orderService.getVendorOrders(user.tenantId, query);
    return ApiResponse.ok(result, 'Vendor orders retrieved');
  }

  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Patch('vendor/:id/status')
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.ORDER_FULFILL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update order status (PLACED→CONFIRMED or CONFIRMED→SHIPPED)' })
  async updateVendorOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    const order = await this.orderService.updateStatusAsVendor(id, dto, user);
    return ApiResponse.ok(order, 'Order status updated');
  }

  // ── Admin ─────────────────────────────────────────────────────────────────────

  @Get('admin')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @ApiOperation({ summary: 'Get all platform orders (admin)' })
  async getAllOrders(@Query() query: QueryOrdersDto) {
    const result = await this.orderService.getAllOrders(query);
    return ApiResponse.ok(result, 'All orders retrieved');
  }

  @Get('admin/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @ApiOperation({ summary: 'Get any order by ID (admin)' })
  async getOrderAdmin(@Param('id') id: string, @CurrentUser() user: any) {
    const order = await this.orderService.getOrderById(id, user);
    return ApiResponse.ok(order, 'Order retrieved');
  }

  @Patch('admin/:id/status')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Override order status (admin — any transition except from terminal)' })
  async adminUpdateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    const order = await this.orderService.updateStatusAsAdmin(id, dto, user.id);
    return ApiResponse.ok(order, 'Order status overridden');
  }
}
