import { Module } from '@nestjs/common';
import { TrapController } from './trap.controller';

/**
 * AuditService is provided by the global AuditModule, so no providers
 * needed here — just register the controller.
 */
@Module({
  controllers: [TrapController],
})
export class TrapModule {}
