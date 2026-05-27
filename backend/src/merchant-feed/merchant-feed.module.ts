import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MerchantFeedController } from './merchant-feed.controller';
import { MerchantFeedService } from './merchant-feed.service';

@Module({
  imports: [PrismaModule],
  controllers: [MerchantFeedController],
  providers: [MerchantFeedService],
})
export class MerchantFeedModule {}
