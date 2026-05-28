import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import {
  CreateNfcTagDto, UpdateNfcTagDto, QueryNfcTagsDto, BulkUpdateDestinationDto,
  BulkGenerateNfcTagsDto, AssignNfcTagDto,
} from './dto/nfc.dto';

@Injectable()
export class NfcService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
  ) {}

  async listTags(query: QueryNfcTagsDto) {
    const where: any = {};
    // Search across name, tagId fragment, batchId, and assignedToUser email/name
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
        { staticUrl: { contains: q, mode: 'insensitive' } },
        { destinationUrl: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { batchId: { contains: q, mode: 'insensitive' } },
        { assignedToUser: { is: { email: { contains: q, mode: 'insensitive' } } } } as any,
        { assignedToUser: { is: { name: { contains: q, mode: 'insensitive' } } } } as any,
      ];
    }
    if (query.enabled !== undefined) where.enabled = query.enabled;
    if (query.batchId) where.batchId = query.batchId;
    if (query.assignedToUserId) (where as any).assignedToUserId = query.assignedToUserId;
    if (query.tenantId) where.tenantId = query.tenantId;

    const [items, total] = await Promise.all([
      (this.prisma.nfcTag.findMany as any)({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit ?? 20,
        include: {
          tenant: { select: { id: true, slug: true, displayName: true } },
          assignedToUser: { select: { id: true, email: true, name: true } },
        },
      }),
      (this.prisma.nfcTag.count as any)({ where }),
    ]);
    return { items, total, page: query.page ?? 1, limit: query.limit ?? 20 };
  }

  /** List unique batches with counts — useful for the admin "select batch" dropdown. */
  async listBatches() {
    const groups = await (this.prisma.nfcTag.groupBy as any)({
      by: ['batchId'],
      _count: { _all: true },
      where: { batchId: { not: null } },
      take: 100,
    });
    return groups
      .map((g: any) => ({ batchId: g.batchId, count: g._count?._all ?? 0 }))
      .sort((a: any, b: any) => b.count - a.count);
  }

  async getTag(id: string) {
    const tag = await this.prisma.nfcTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('NFC tag not found');
    return tag;
  }

  async createTag(dto: CreateNfcTagDto, actorId: string) {
    const appUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://vibehub.com.tr';
    // Pre-generate UUID so staticUrl is computed atomically in a single create
    const id = randomUUID();
    const staticUrl = dto.staticUrl?.trim() || `${appUrl}/nfc/${id}`;
    const tag = await this.prisma.nfcTag.create({
      data: {
        id,
        name: dto.name,
        destinationUrl: dto.destinationUrl,
        staticUrl,
        ...(dto.tenantId ? { tenantId: dto.tenantId } : {}),
        ...(dto.assignedToUserId ? { assignedToUserId: dto.assignedToUserId } as any : {}),
        ...(dto.notes ? { notes: dto.notes } as any : {}),
      } as any,
    });
    await this.audit.log({
      actorId,
      action: 'NFC_TAG_CREATE',
      targetType: 'NfcTag',
      targetId: tag.id,
      metadata: { name: dto.name, destinationUrl: dto.destinationUrl, staticUrl },
    });
    return tag;
  }

  /**
   * Bulk-generate N tags in a single transaction. Each gets a unique UUID +
   * staticUrl + sequential name like "Concert Wristband #001".
   * Audit-logged once per batch (not per tag) to keep the audit log readable.
   */
  async bulkGenerate(dto: BulkGenerateNfcTagsDto, actorId: string) {
    const appUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://vibehub.com.tr';
    const batchId = dto.batchId?.trim() || `batch-${Date.now().toString(36)}`;

    // Build N rows before insert
    const rows = Array.from({ length: dto.count }, (_, i) => {
      const id = randomUUID();
      const seq = String(i + 1).padStart(String(dto.count).length, '0');
      return {
        id,
        name: `${dto.namePrefix} #${seq}`,
        destinationUrl: dto.destinationUrl,
        staticUrl: `${appUrl}/nfc/${id}`,
        batchId,
        ...(dto.tenantId ? { tenantId: dto.tenantId } : {}),
        ...(dto.notes ? { notes: dto.notes } : {}),
      };
    });

    // createMany is ~100x faster than per-row create for 1000 rows
    const result = await this.prisma.nfcTag.createMany({
      data: rows as any,
      skipDuplicates: true,
    });

    await this.audit.log({
      actorId,
      action: 'NFC_BULK_GENERATE',
      targetType: 'NfcTag',
      targetId: batchId,
      metadata: {
        count: result.count,
        batchId,
        namePrefix: dto.namePrefix,
        destinationUrl: dto.destinationUrl,
        tenantId: dto.tenantId,
      },
    });

    return {
      batchId,
      created: result.count,
      requested: dto.count,
    };
  }

  /** Assign or unassign a tag to a specific user (for per-person tags). */
  async assignTag(id: string, dto: AssignNfcTagDto, actorId: string) {
    const tag = await this.getTag(id);
    const prevAssigned = (tag as any).assignedToUserId ?? null;
    const newAssigned = dto.assignedToUserId?.trim() || null;
    const updated = await this.prisma.nfcTag.update({
      where: { id },
      data: { assignedToUserId: newAssigned } as any,
    });
    await this.audit.log({
      actorId,
      action: newAssigned ? 'NFC_TAG_ASSIGN' : 'NFC_TAG_UNASSIGN',
      targetType: 'NfcTag',
      targetId: id,
      metadata: { from: prevAssigned, to: newAssigned },
    });
    return updated;
  }

  async updateTag(id: string, dto: UpdateNfcTagDto, actorId: string) {
    await this.getTag(id);
    const updated = await this.prisma.nfcTag.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.destinationUrl !== undefined && { destinationUrl: dto.destinationUrl }),
        ...(dto.staticUrl !== undefined && { staticUrl: dto.staticUrl }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.tenantId !== undefined && { tenantId: dto.tenantId }),
      },
    });
    await this.audit.log({
      actorId,
      action: 'NFC_TAG_UPDATE',
      targetType: 'NfcTag',
      targetId: id,
      metadata: dto as any,
    });
    return updated;
  }

  async deleteTag(id: string, actorId: string) {
    await this.getTag(id);
    await this.prisma.nfcTag.delete({ where: { id } });
    await this.audit.log({
      actorId,
      action: 'NFC_TAG_DELETE',
      targetType: 'NfcTag',
      targetId: id,
      metadata: {},
    });
    return { deleted: true };
  }

  async resetScanCount(id: string, actorId: string) {
    await this.getTag(id);
    const updated = await this.prisma.nfcTag.update({
      where: { id },
      data: { scanCount: 0, lastScannedAt: null },
    });
    await this.audit.log({
      actorId,
      action: 'NFC_TAG_RESET_COUNT',
      targetType: 'NfcTag',
      targetId: id,
      metadata: {},
    });
    return updated;
  }

  async bulkUpdateByTenant(dto: BulkUpdateDestinationDto, actorId: string) {
    const result = await this.prisma.nfcTag.updateMany({
      where: { tenantId: dto.tenantId },
      data: { destinationUrl: dto.destinationUrl, updatedAt: new Date() },
    });
    await this.audit.log({
      actorId,
      action: 'NFC_BULK_UPDATE_DESTINATION',
      targetType: 'NfcTag',
      targetId: dto.tenantId,
      metadata: { tenantId: dto.tenantId, destinationUrl: dto.destinationUrl, count: result.count },
    });
    return { updated: result.count };
  }

  async handleRedirect(tagId: string): Promise<string | null> {
    const tag = await this.prisma.nfcTag.findUnique({ where: { id: tagId } });
    if (!tag || !tag.enabled) return null;
    await this.prisma.nfcTag.update({
      where: { id: tagId },
      data: { scanCount: { increment: 1 }, lastScannedAt: new Date() },
    });
    return tag.destinationUrl;
  }
}
