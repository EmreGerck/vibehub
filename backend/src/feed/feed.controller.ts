import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiResponse } from '../common/response.dto';

@ApiTags('Feed')
@ApiBearerAuth()
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Personalized feed — new drops from followed artists' })
  async getFeed(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const result = await this.feedService.getFeed(
      user.id,
      parseInt(page),
      parseInt(limit),
    );
    return ApiResponse.ok(result, 'Feed retrieved');
  }
}
