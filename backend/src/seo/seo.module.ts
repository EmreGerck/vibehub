import { Global, Module } from '@nestjs/common';
import { SeoService } from './seo.service';

@Global()
@Module({
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {}
