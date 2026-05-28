import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as Sentry from '@sentry/node';
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

export interface VendorApplicationReceivedMailJob {
  type: 'VENDOR_APPLICATION_RECEIVED';
  to: string;
  displayName: string;
}

export interface AdminVendorAppliedMailJob {
  type: 'ADMIN_VENDOR_APPLIED';
  to: string;
  tenantDisplayName: string;
  ownerEmail: string;
}

export interface VendorRejectedMailJob {
  type: 'VENDOR_REJECTED';
  to: string;
  tenantDisplayName: string;
  reason?: string;
}

export type MailJob =
  | WelcomeMailJob
  | OrderConfirmationMailJob
  | ShipmentNotificationMailJob
  | VendorApplicationReceivedMailJob
  | AdminVendorAppliedMailJob
  | VendorRejectedMailJob;

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

      case 'VENDOR_APPLICATION_RECEIVED':
        await this.mail.sendVendorApplicationReceived(data.to, data.displayName);
        break;

      case 'ADMIN_VENDOR_APPLIED':
        await this.mail.sendAdminVendorApplied(data.to, data.tenantDisplayName, data.ownerEmail);
        break;

      case 'VENDOR_REJECTED':
        await this.mail.sendVendorRejected(data.to, data.tenantDisplayName, data.reason);
        break;

      default:
        this.logger.warn(`[MAIL] Unknown mail job type`);
    }
  }

  /**
   * DLQ-equivalent: every failure on the mail queue is logged here.
   *
   * BullMQ doesn't have a native dead-letter queue concept, but a job that
   * exhausts its `attempts` ends up in the `failed` set permanently — that's
   * functionally a DLQ. The `failed` event fires once per attempt (not just
   * the final one), so we differentiate using `attemptsMade >= opts.attempts`.
   *
   * Sentry capture is gated on SENTRY_DSN being set at process boot time
   * (`main.ts` initialises Sentry conditionally, so the SDK is a no-op when
   * the env var is missing — but we still guard to avoid unhelpful breadcrumbs).
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<MailJob>, err: Error) {
    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts?.attempts ?? 1;
    const exhausted = attemptsMade >= maxAttempts;

    const label = exhausted ? '[MAIL][DLQ]' : '[MAIL][retry]';
    this.logger.error(
      `${label} job=${job.id} type=${(job.data as any)?.type} attempt=${attemptsMade}/${maxAttempts} err=${err?.message ?? err}`,
    );

    // Only ship terminal failures to Sentry — retried-but-recovered jobs are noise.
    if (exhausted && process.env.SENTRY_DSN) {
      Sentry.captureException(err, {
        tags: { queue: 'mail', jobType: (job.data as any)?.type },
        extra: {
          jobId: job.id,
          attemptsMade,
          maxAttempts,
          // Avoid leaking PII (recipient email) into Sentry — type + orderId is enough for triage.
          orderId: (job.data as any)?.orderId,
        },
      });
    }
  }
}
