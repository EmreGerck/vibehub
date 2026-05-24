import { Global, Module } from '@nestjs/common';
import { EInvoiceService } from './einvoice.service';
import { EInvoiceController } from './einvoice.controller';

@Global()
@Module({
  controllers: [EInvoiceController],
  providers: [EInvoiceService],
  exports: [EInvoiceService],
})
export class EInvoiceModule {}
