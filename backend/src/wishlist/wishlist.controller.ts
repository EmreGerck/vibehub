import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';

@Controller('wishlist')
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Post(':productId')
  async toggle(@CurrentUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    const result = await this.wishlistService.toggle(user.id, productId);
    return { success: true, data: result, message: result.added ? 'Added to wishlist' : 'Removed from wishlist' };
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.wishlistService.list(user.id);
    return { success: true, data, message: 'Wishlist retrieved' };
  }

  @Get('check/:productId')
  async check(@CurrentUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    const data = await this.wishlistService.check(user.id, productId);
    return { success: true, data, message: 'Wishlist status checked' };
  }
}
