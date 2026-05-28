import { Module } from '@nestjs/common';
import { TradeLedgerController } from './trade-ledger.controller';
import { TradeLedgerService } from './trade-ledger.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TradeLedgerController],
  providers: [TradeLedgerService],
  exports: [TradeLedgerService],
})
export class TradeLedgerModule {}
