import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('reviews')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReviewDto) {
    const review = await this.reviewService.create(user.id, dto);
    return { success: true, data: review, message: 'Review created' };
  }

  @Public()
  @Get()
  async findByProduct(
    @Query('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.reviewService.findByProduct(
      productId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
    return { success: true, data, message: 'Reviews retrieved' };
  }

  @Public()
  @Get('stats')
  async getStats(@Query('productId') productId: string) {
    const data = await this.reviewService.getStats(productId);
    return { success: true, data, message: 'Review stats retrieved' };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const isAdmin = user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.GOD_USER;
    await this.reviewService.remove(id, user.id, isAdmin);
    return { success: true, message: 'Review deleted' };
  }
}
