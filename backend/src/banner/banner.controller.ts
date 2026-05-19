import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/public.decorator';
import { ApiResponse } from '../common/response.dto';

@ApiTags('Banners')
@Controller('banners')
export class BannerController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active hero banners (public)' })
  async getActiveBanners(@Query('lang') lang = 'tr') {
    const banners = await this.prisma.heroBanner.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        tenant: { select: { id: true, slug: true, displayName: true } },
      },
    });

    const localized = banners.map((banner) => {
      if (lang !== 'tr') {
        const t = (banner.translations as Record<string, any>)?.[lang];
        if (t) {
          return {
            ...banner,
            subtitle: t.subtitle ?? banner.subtitle,
            heading: t.heading ?? banner.heading,
            description: t.description ?? banner.description,
            buttonText: t.buttonText ?? banner.buttonText,
          };
        }
      }
      return banner;
    });

    return ApiResponse.ok(localized, 'Active banners retrieved');
  }
}
