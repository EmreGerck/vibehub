import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

/**
 * SchedulerModule
 * ---------------
 * Only responsible for registering @nestjs/schedule globally.
 * The individual scheduled services live in their domain modules
 * (e.g. SecurityDigestService in AdminModule) to avoid circular dependencies.
 */
@Module({
  imports: [ScheduleModule.forRoot()],
})
export class SchedulerModule {}
