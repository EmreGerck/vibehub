import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MAIL_QUEUE, ORDER_QUEUE } from './queue.constants';
import { MailJob } from './processors/mail.processor';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    @InjectQueue(ORDER_QUEUE) private readonly orderQueue: Queue,
  ) {}

  async sendMail(job: MailJob): Promise<void> {
    await this.mailQueue.add(job.type, job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  async queueOrderProcessing(orderId: string): Promise<void> {
    await this.orderQueue.add(
      'PROCESS_ORDER',
      { orderId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
  }
}
