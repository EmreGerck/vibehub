import { Module } from '@nestjs/common';
import { IyzicoService } from './iyzico.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EInvoiceModule } from '../einvoice/einvoice.module';

@Module({
  imports: [PrismaModule, EInvoiceModule],
  controllers: [PaymentController],
  providers: [IyzicoService],
  exports: [IyzicoService],
})
export class PaymentModule {}
