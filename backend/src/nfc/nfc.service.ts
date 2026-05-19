import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { CreateNfcTagDto, UpdateNfcTagDto, QueryNfcTagsDto, BulkUpdateDestinationDto } from './dto/nfc.dto';

@Injectable()
export class NfcService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
  ) {}

  async listTags(query: QueryNfcTagsDto) {
    const where: any = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.enabled !== undefined) {
      where.enabled = query.enabled;
    }
    const [items, total] = await Promise.all([
      this.prisma.nfcTag.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit ?? 20,
      }),
      this.prisma.nfcTag.count({ where }),
    ]);
    return { items, total, page: query.page ?? 1, limit: query.limit ?? 20 };
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
      },
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
