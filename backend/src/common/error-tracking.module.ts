import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ErrorTrackingService } from './error-tracking.service';
import { ErrorTrackingFilter } from './error-tracking.filter';

@Module({
  imports: [PrismaModule],
  providers: [ErrorTrackingService, ErrorTrackingFilter],
  exports: [ErrorTrackingService, ErrorTrackingFilter],
})
export class ErrorTrackingModule {}
