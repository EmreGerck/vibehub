import { Module } from '@nestjs/common';
import { IyzicoService } from './iyzico.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [IyzicoService],
  exports: [IyzicoService],
})
export class PaymentModule {}
