import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { VendorModule } from '../vendor/vendor.module';
import { MediaModule } from '../media/media.module';
import { ForumModule } from '../forum/forum.module';

@Module({
  imports: [VendorModule, MediaModule, ForumModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
