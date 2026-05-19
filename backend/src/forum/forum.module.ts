import { Module } from '@nestjs/common';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { AuditModule } from '../audit/audit.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [AuditModule, PushModule],
  controllers: [ForumController],
  providers: [ForumService],
  exports: [ForumService],
})
export class ForumModule {}
