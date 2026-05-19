import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMediaDto, UpdateMediaDto } from './dto/media.dto';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private toEmbedUrl(type: MediaType, rawUrl: string): string {
    if (type === MediaType.SPOTIFY) {
      // https://open.spotify.com/track/xxx → https://open.spotify.com/embed/track/xxx
      const match = rawUrl.match(/open\.spotify\.com\/(track|album|playlist|artist|episode)\/([a-zA-Z0-9]+)/);
      if (!match) throw new BadRequestException('Invalid Spotify URL. Use an open.spotify.com link.');
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
    } else {
      // YouTube: various formats → embed
      let videoId: string | null = null;
      const patterns = [
        /(?:v=)([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /embed\/([a-zA-Z0-9_-]{11})/,
      ];
      for (const p of patterns) {
        const m = rawUrl.match(p);
        if (m) { videoId = m[1]; break; }
      }
      if (!videoId) throw new BadRequestException('Invalid YouTube URL.');
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }

  async listPublic(tenantId: string) {
    return this.prisma.vendorMedia.findMany({
      where: { tenantId, active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listForVendor(tenantId: string) {
    return this.prisma.vendorMedia.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateMediaDto, actorId: string) {
    const embedUrl = this.toEmbedUrl(dto.type, dto.url);
    const media = await this.prisma.vendorMedia.create({
      data: {
        tenantId,
        type: dto.type,
        url: embedUrl,
        title: dto.title,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.log({
      actorId,
      action: 'MEDIA_CREATE',
      targetType: 'VendorMedia',
      targetId: media.id,
      metadata: { type: dto.type, tenantId },
    });
    return media;
  }

  async update(id: string, dto: UpdateMediaDto, actorId: string, tenantIdCheck?: string) {
    const media = await this.prisma.vendorMedia.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');
    if (tenantIdCheck && media.tenantId !== tenantIdCheck) throw new ForbiddenException();

    let embedUrl = media.url;
    if (dto.url && dto.type) embedUrl = this.toEmbedUrl(dto.type, dto.url);
    else if (dto.url) embedUrl = this.toEmbedUrl(media.type, dto.url);

    const updated = await this.prisma.vendorMedia.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        url: embedUrl,
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
    await this.audit.log({ actorId, action: 'MEDIA_UPDATE', targetType: 'VendorMedia', targetId: id, metadata: dto as any });
    return updated;
  }

  async delete(id: string, actorId: string, tenantIdCheck?: string) {
    const media = await this.prisma.vendorMedia.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');
    if (tenantIdCheck && media.tenantId !== tenantIdCheck) throw new ForbiddenException();
    await this.prisma.vendorMedia.delete({ where: { id } });
    await this.audit.log({ actorId, action: 'MEDIA_DELETE', targetType: 'VendorMedia', targetId: id, metadata: {} });
    return { deleted: true };
  }
}
