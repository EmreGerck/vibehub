import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  /** Null for anonymous security events (failed login on unknown email, honeypot, trap routes). */
  actorId: string | null;
  action: string;
  targetType: string;
  /** Null when the event has no concrete target (e.g. trap-route scans). */
  targetId: string | null;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId,
          metadata: entry.metadata ?? {},
        },
      });
    } catch (err: any) {
      // Audit failures must never crash the calling operation
      this.logger.error(`Audit log failed: ${err?.message ?? err}`, entry);
    }
  }
}
