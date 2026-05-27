import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/public.decorator';
import { MerchantFeedService } from './merchant-feed.service';

/**
 * Public endpoint that serves a Google Merchant Center XML feed.
 * Submit this URL in Google Merchant Center → Products → Feeds.
 *
 * Cache: 1 hour at CDN level. Google polls the feed; we don't push.
 */
@Controller()
export class MerchantFeedController {
  constructor(private readonly feed: MerchantFeedService) {}

  @Public()
  @Get('merchant-feed.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  async getFeed(@Res() res: Response) {
    const xml = await this.feed.buildFeedXml();
    res.send(xml);
  }
}
