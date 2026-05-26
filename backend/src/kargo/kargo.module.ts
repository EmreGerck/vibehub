import { Module } from '@nestjs/common';
import { KargoService } from './kargo.service';
import { KargoController } from './kargo.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports:     [PrismaModule, MailModule],
  controllers: [KargoController],
  providers:   [KargoService],
  exports:     [KargoService],
})
export class KargoModule {}
