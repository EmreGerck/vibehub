import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { MailJob } from './processors/mail.processor';

// Serverless-compatible QueueService — sends mail synchronously instead
// of enqueuing to BullMQ (which requires a persistent worker process)
@Injectable()
export class QueueServiceServerless {
  private readonly logger = new Logger(QueueServiceServerless.name);

  constructor(private readonly mail: MailService) {}

  async sendMail(job: MailJob): Promise<void> {
    try {
      if (job.type === 'VENDOR_WELCOME') {
        await this.mail.sendVendorWelcome(job.to, job.tenantDisplayName);
      } else if (job.type === 'ORDER_CONFIRMATION') {
        await this.mail.sendOrderConfirmation(job.to, job.orderId);
      } else if (job.type === 'SHIPMENT_NOTIFICATION') {
        this.logger.log(`[ServerlessQueue] Shipment notification skipped for order ${job.orderId}`);
      }
    } catch (err) {
      this.logger.error('[ServerlessQueue] Mail send failed', err);
    }
  }

  async queueOrderProcessing(_orderId: string): Promise<void> {
    // No-op in serverless — order processing is handled synchronously
  }
}
