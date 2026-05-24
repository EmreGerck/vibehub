import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { VendorModule } from '../vendor/vendor.module';
import { MediaModule } from '../media/media.module';
import { ForumModule } from '../forum/forum.module';
import { SecurityDigestService } from '../scheduler/security-digest.service';

@Module({
  imports: [VendorModule, MediaModule, ForumModule],
  controllers: [AdminController],
  providers: [AdminService, SecurityDigestService],
  exports: [AdminService, SecurityDigestService],
})
export class AdminModule {}
