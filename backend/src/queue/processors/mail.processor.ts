import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MAIL_QUEUE } from '../queue.constants';
import { MailService } from '../../mail/mail.service';

export interface WelcomeMailJob {
  type: 'VENDOR_WELCOME';
  to: string;
  tenantDisplayName: string;
}

export interface OrderConfirmationMailJob {
  type: 'ORDER_CONFIRMATION';
  to: string;
  orderId: string;
}

export interface ShipmentNotificationMailJob {
  type: 'SHIPMENT_NOTIFICATION';
  to: string;
  orderId: string;
  trackingNumber: string | null;
  carrier: string | null;
}

export type MailJob = WelcomeMailJob | OrderConfirmationMailJob | ShipmentNotificationMailJob;

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mail: MailService) {
    super();
  }

  async process(job: Job<MailJob>): Promise<void> {
    const data = job.data;

    switch (data.type) {
      case 'VENDOR_WELCOME':
        await this.mail.sendVendorWelcome(data.to, data.tenantDisplayName);
        break;

      case 'ORDER_CONFIRMATION':
        await this.mail.sendOrderConfirmation(data.to, data.orderId);
        break;

      case 'SHIPMENT_NOTIFICATION':
        await this.mail.sendShipmentNotification(data.to, data.orderId, data.trackingNumber, data.carrier);
        break;

      default:
        this.logger.warn(`[MAIL] Unknown mail job type`);
    }
  }
}
