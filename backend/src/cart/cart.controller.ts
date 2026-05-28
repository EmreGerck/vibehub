import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart-item.dto';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { ApiResponse } from '../common/response.dto';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart (enriched with product/variant data)' })
  async getCart(@CurrentUser() user: AuthenticatedUser) {
    const items = await this.cartService.getCart(user.id);
    const total = items.reduce((sum, i) => sum + i.lineTotal, 0);
    return ApiResponse.ok({ items, total, itemCount: items.length }, 'Cart retrieved');
  }

  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Post('items')
  @ApiOperation({ summary: 'Add an item to cart' })
  async addItem(@Body() dto: AddCartItemDto, @CurrentUser() user: AuthenticatedUser) {
    const items = await this.cartService.addItem(user.id, dto);
    const total = items.reduce((sum, i) => sum + i.lineTotal, 0);
    return ApiResponse.ok({ items, total, itemCount: items.length }, 'Item added');
  }

  @Patch('items/:variantId')
  @ApiOperation({ summary: 'Update item quantity (set qty=0 to remove)' })
  async updateItem(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const items = await this.cartService.updateItem(user.id, variantId, dto);
    const total = items.reduce((sum, i) => sum + i.lineTotal, 0);
    return ApiResponse.ok({ items, total, itemCount: items.length }, 'Cart updated');
  }

  @Delete('items/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an item from cart' })
  async removeItem(@Param('variantId') variantId: string, @CurrentUser() user: AuthenticatedUser) {
    const items = await this.cartService.removeItem(user.id, variantId);
    const total = items.reduce((sum, i) => sum + i.lineTotal, 0);
    return ApiResponse.ok({ items, total, itemCount: items.length }, 'Item removed');
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear entire cart' })
  async clearCart(@CurrentUser() user: AuthenticatedUser) {
    await this.cartService.clearCart(user.id);
    return ApiResponse.ok(null, 'Cart cleared');
  }
}
