import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { StorageModule } from '../storage/storage.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [StorageModule, PushModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
