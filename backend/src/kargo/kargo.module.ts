import { Module } from '@nestjs/common';
import { KargoService } from './kargo.service';
import { KargoController } from './kargo.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [KargoController],
  providers:   [KargoService],
  exports:     [KargoService],
})
export class KargoModule {}
