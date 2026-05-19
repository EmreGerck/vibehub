import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [DevicesModule],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
