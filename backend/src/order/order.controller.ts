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
import { IsString, MaxLength, IsOptional } from 'class-validator';
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

class RequestRefundDto {
  @IsString() @MaxLength(1000) reason: string;
}

class RejectRefundDto {
  @IsString() @MaxLength(1000) note: string;
}

class ApproveRefundDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

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

  @Patch('my/:id/cancel-preorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pre-order before it ships (customer-initiated)' })
  async cancelPreOrder(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.orderService.cancelPreOrder(id, user.id);
    return ApiResponse.ok(result, 'Pre-order cancelled');
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Patch('my/:id/request-refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer submits a refund request for a delivered order' })
  async requestRefund(
    @Param('id') id: string,
    @Body() dto: RequestRefundDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.orderService.requestRefund(id, user.id, dto.reason);
    return ApiResponse.ok(result, 'Refund request submitted');
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

  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Patch('admin/:id/approve-refund')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin approves a refund request → REFUNDED' })
  async approveRefund(
    @Param('id') id: string,
    @Body() dto: ApproveRefundDto,
    @CurrentUser() user: any,
  ) {
    const order = await this.orderService.approveRefund(id, user.id, dto.note);
    return ApiResponse.ok(order, 'Refund approved');
  }

  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Patch('admin/:id/reject-refund')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin rejects a refund request → back to DELIVERED' })
  async rejectRefund(
    @Param('id') id: string,
    @Body() dto: RejectRefundDto,
    @CurrentUser() user: any,
  ) {
    const order = await this.orderService.rejectRefund(id, user.id, dto.note);
    return ApiResponse.ok(order, 'Refund rejected');
  }
}
