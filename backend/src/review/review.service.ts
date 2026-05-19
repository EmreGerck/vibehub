import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || product.status !== 'LIVE') {
      throw new NotFoundException('Product not found');
    }

    const hasPurchased = await this.prisma.orderItem.findFirst({
      where: {
        order: { customerId: userId, status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED'] } },
        variant: { productId: dto.productId },
      },
    });
    if (!hasPurchased) {
      throw new BadRequestException('You must purchase this product before reviewing it');
    }

    return this.prisma.review.upsert({
      where: { productId_customerId: { productId: dto.productId, customerId: userId } },
      update: { rating: dto.rating, comment: dto.comment },
      create: { productId: dto.productId, customerId: userId, rating: dto.rating, comment: dto.comment },
      include: { customer: { select: { id: true, email: true, name: true } } },
    });
  }

  async findByProduct(productId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        include: { customer: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);
    return { items, total, page, limit };
  }

  async getStats(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const distribution = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId },
      _count: { rating: true },
    });

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => { dist[d.rating] = d._count.rating; });

    return {
      average: agg._avg.rating ?? 0,
      count: agg._count.rating,
      distribution: dist,
    };
  }

  async remove(reviewId: string, userId: string, isAdmin: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (!isAdmin && review.customerId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }
    return this.prisma.review.delete({ where: { id: reviewId } });
  }
}
