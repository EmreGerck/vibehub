import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MAIL_QUEUE, ORDER_QUEUE } from './queue.constants';
import { MailJob } from './processors/mail.processor';

export interface QueueHealth {
  waiting: number;
  active: number;
  failed: number;
  completed: number;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    @InjectQueue(ORDER_QUEUE) private readonly orderQueue: Queue,
  ) {}

  async sendMail(job: MailJob): Promise<void> {
    // Retry 3 times with exponential backoff (5s, 10s, 20s). After the 3rd
    // failure the job ends up in the BullMQ `failed` set permanently and is
    // captured via the MailProcessor.onFailed event (Sentry + logs).
    await this.mailQueue.add(job.type, job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      // Keep the last 1000 failed jobs around so admin can inspect them via
      // the queue-health endpoint; auto-trim older ones to avoid Redis bloat.
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    });
  }

  async queueOrderProcessing(orderId: string): Promise<void> {
    await this.orderQueue.add(
      'PROCESS_ORDER',
      { orderId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  /**
   * Real-time health snapshot for the mail queue.
   * Surfaced via `GET /admin/queue-health` so admins can watch the
   * failed/active counts during a backlog incident without opening a
   * Redis shell.
   */
  async getMailQueueHealth(): Promise<QueueHealth> {
    const [waiting, active, failed, completed] = await Promise.all([
      this.mailQueue.getWaitingCount(),
      this.mailQueue.getActiveCount(),
      this.mailQueue.getFailedCount(),
      this.mailQueue.getCompletedCount(),
    ]);
    return { waiting, active, failed, completed };
  }
}
