import { Body, Controller, Get, Post, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AnalyticsService } from './analytics.service';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '../common/response.dto';

class TrackPageViewDto {
  @IsString() @MaxLength(500) path: string;
  @IsOptional() @IsString() @MaxLength(500) referer?: string;
}

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /**
   * Frontend pings this on every page change.
   * Public + heavily throttled to prevent abuse (1 per second per IP).
   */
  @Public()
  @Throttle({ default: { ttl: 1000, limit: 2 } })
  @Post('pageview')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record a page view (public, throttled)' })
  async trackPageView(
    @Body() dto: TrackPageViewDto,
    @Req() req: any,
    @CurrentUser('id') userId?: string | null,
  ) {
    const ip = req.ip ?? req.connection?.remoteAddress ?? null;
    const ua = req.headers?.['user-agent'] as string | undefined;
    // Fire-and-forget — don't await
    void this.analytics.record({
      userAgent: ua,
      ip,
      path: dto.path,
      referer: dto.referer,
      userId: userId ?? null,
    });
  }

  /**
   * Admin dashboard widget: device brand/model breakdown over last N days.
   */
  @ApiBearerAuth()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @Get('devices')
  @ApiOperation({ summary: 'Visitor device brand/model breakdown (admin dashboard)' })
  async getDevices(@Query('days') daysParam?: string) {
    const days = Math.min(365, Math.max(1, parseInt(daysParam ?? '30', 10) || 30));
    const data = await this.analytics.getDeviceBreakdown(days);
    return ApiResponse.ok(data, 'Device breakdown');
  }
}
