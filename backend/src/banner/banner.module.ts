import { Module } from '@nestjs/common';
import { BannerController } from './banner.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BannerController],
})
export class BannerModule {}
