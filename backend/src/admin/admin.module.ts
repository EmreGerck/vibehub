import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { VendorModule } from '../vendor/vendor.module';
import { MediaModule } from '../media/media.module';
import { ForumModule } from '../forum/forum.module';
import { QueueModule } from '../queue/queue.module';
import { SecurityDigestService } from '../scheduler/security-digest.service';
import { AuditRetentionService } from '../scheduler/audit-retention.service';
import { BusinessMetricsService } from './business-metrics.service';

@Module({
  imports: [VendorModule, MediaModule, ForumModule, QueueModule],
  controllers: [AdminController],
  providers: [AdminService, SecurityDigestService, AuditRetentionService, BusinessMetricsService],
  exports: [AdminService, SecurityDigestService, AuditRetentionService, BusinessMetricsService],
})
export class AdminModule {}
