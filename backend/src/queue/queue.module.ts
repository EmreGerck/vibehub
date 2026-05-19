import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MailProcessor } from './processors/mail.processor';
import { QueueService } from './queue.service';
import { MAIL_QUEUE, ORDER_QUEUE } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const tls = config.get('REDIS_TLS') === 'true';
        return {
          connection: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get('REDIS_PASSWORD'),
            ...(tls ? { tls: {} } : {}),
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: MAIL_QUEUE },
      { name: ORDER_QUEUE },
    ),
  ],
  providers: [MailProcessor, QueueService],
  exports: [QueueService],
})
export class QueueModule {}
