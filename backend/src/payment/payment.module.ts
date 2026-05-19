import { Module } from '@nestjs/common';
import { IyzicoService } from './iyzico.service';
import { PaymentController } from './payment.controller';

@Module({
  controllers: [PaymentController],
  providers: [IyzicoService],
  exports: [IyzicoService],
})
export class PaymentModule {}
