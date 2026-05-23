import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PushService } from '../push/push.service';
import {
  CreateTopicDto,
  CreateReplyDto,
  UpdateForumSettingsDto,
  QueryTopicsDto,
  CreateChannelDto,
  UpdateChannelDto,
  ToggleReactionDto,
} from './dto/forum.dto';

const AUTHOR_SELECT = { id: true, email: true, name: true, tenantId: true, avatarUrl: true };

const REACTION_COUNT_SELECT = {
  FIRE: true, HEART: true, CLAP: true, EYES: true, HUNDRED: true, ROCKET: true,
};

/** Aggregate raw reactions array into { FIRE: n, HEART: n, ... } */
function aggregateReactions(reactions: Array<{ emoji: string }>) {
  const counts: Record<string, number> = { FIRE: 0, HEART: 0, CLAP: 0, EYES: 0, HUNDRED: 0, ROCKET: 0 };
  for (const r of reactions) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
  return counts;
}

/** Map user's reactions into a Set<emoji> */
function myReactions(reactions: Array<{ emoji: string; userId: string }>, userId?: string): string[] {
  if (!userId) return [];
  return reactions.filter((r) => r.userId === userId).map((r) => r.emoji);
}

const DEFAULT_CHANNELS = [
  { name: 'Genel', slug: 'genel', emoji: '💬', sortOrder: 0, isDefault: true },
  { name: 'Soru & Cevap', slug: 'soru-cevap', emoji: '❓', sortOrder: 1 },
  { name: 'Fanlar', slug: 'fanlar', emoji: '🎉', sortOrder: 2 },
  { name: 'Müzik', slug: 'muzik', emoji: '🎵', sortOrder: 3 },
  { name: 'Etkinlikler', slug: 'etkinlikler', emoji: '🎫', sortOrder: 4 },
];

@Injectable()
export class ForumService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private push: PushService,
  ) {}

  // ── Settings ─────────────────────────────────────────────────────────────────

  async getSettings(tenantId: string) {
    // Hard kill-switch: god-user can disable forum entirely at the tenant level
    // (independent of ForumSettings.enabled). Treat as if the forum doesn't exist.
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { forumEnabled: true },
    });
    if (!tenant) throw new NotFoundException('Vendor not found');
    if (!tenant.forumEnabled) {
      // Return a synthetic disabled settings object so existing callers see enabled=false.
      return {
        id: 'disabled',
        tenantId,
        enabled: false,
        requireApproval: false,
        allowGuestView: false,
        moderationMode: 'LOCKED' as const,
        allowAnonymous: false,
        minPostLength: 1,
        maxPostLength: 5000,
        allowImages: false,
        allowLinks: false,
        allowMentions: false,
        allowReactions: false,
        allowReplies: false,
        slowModeSeconds: 0,
        visibility: 'PUBLIC' as const,
        postingPolicy: 'EVERYONE' as const,
        bannedKeywords: [] as string[],
        autoArchiveDays: 0,
        welcomeMessage: null,
        rulesText: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    }

    let settings = await this.prisma.forumSettings.findUnique({ where: { tenantId } });
    if (!settings) {
      settings = await this.prisma.forumSettings.create({ data: { tenantId } });
    }
    return settings;
  }

  async updateSettings(tenantId: string, dto: UpdateForumSettingsDto, actorId: string) {
    await this.getSettings(tenantId);
    const updated = await this.prisma.forumSettings.update({ where: { tenantId }, data: dto });
    await this.audit.log({
      actorId,
      action: 'FORUM_SETTINGS_UPDATE',
      targetType: 'ForumSettings',
      targetId: tenantId,
      metadata: dto as any,
    });
    return updated;
  }

  // ── Channels ─────────────────────────────────────────────────────────────────

  async getChannels(tenantId: string) {
    let channels = await this.prisma.forumChannel.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { topics: true } } },
    });

    // Auto-seed default channels if none exist yet
    if (channels.length === 0) {
      await this.prisma.forumChannel.createMany({
        data: DEFAULT_CHANNELS.map((c) => ({ ...c, tenantId })),
        skipDuplicates: true,
      });
      channels = await this.prisma.forumChannel.findMany({
        where: { tenantId },
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { topics: true } } },
      });
    }

    return channels;
  }

  async createChannel(tenantId: string, dto: CreateChannelDto, actorId: string) {
    const existing = await this.prisma.forumChannel.findUnique({
      where: { tenantId_slug: { tenantId, slug: dto.slug } },
    });
    if (existing) throw new BadRequestException('Channel slug already exists');
    const channel = await this.prisma.forumChannel.create({
      data: { ...dto, tenantId },
    });
    await this.audit.log({ actorId, action: 'FORUM_CHANNEL_CREATE', targetType: 'ForumChannel', targetId: channel.id, metadata: dto as any });
    return channel;
  }

  async updateChannel(channelId: string, tenantId: string, dto: UpdateChannelDto, actorId: string) {
    const channel = await this.prisma.forumChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.tenantId !== tenantId) throw new ForbiddenException();
    const updated = await this.prisma.forumChannel.update({ where: { id: channelId }, data: dto });
    await this.audit.log({ actorId, action: 'FORUM_CHANNEL_UPDATE', targetType: 'ForumChannel', targetId: channelId, metadata: dto as any });
    return updated;
  }

  async deleteChannel(channelId: string, tenantId: string, actorId: string) {
    const channel = await this.prisma.forumChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.tenantId !== tenantId) throw new ForbiddenException();
    // Move topics in this channel to uncategorized (null)
    await this.prisma.forumTopic.updateMany({ where: { channelId }, data: { channelId: null } });
    await this.prisma.forumChannel.delete({ where: { id: channelId } });
    await this.audit.log({ actorId, action: 'FORUM_CHANNEL_DELETE', targetType: 'ForumChannel', targetId: channelId, metadata: {} });
    return { deleted: true };
  }

  // ── Topics ────────────────────────────────────────────────────────────────────

  async listTopics(tenantId: string, query: QueryTopicsDto, currentUserId?: string) {
    // Resolve channelId from slug if needed
    let channelId = query.channelId;
    if (!channelId && query.channelSlug) {
      const channel = await this.prisma.forumChannel.findUnique({
        where: { tenantId_slug: { tenantId, slug: query.channelSlug } },
      });
      channelId = channel?.id;
    }

    const where: any = { tenantId };
    if (channelId) where.channelId = channelId;
    if (query.sort === 'artist_replied') where.hasArtistReply = true;

    let orderBy: any[];
    if (query.sort === 'popular') {
      orderBy = [{ pinned: 'desc' }, { reactions: { _count: 'desc' } }, { createdAt: 'desc' }];
    } else {
      orderBy = [{ pinned: 'desc' }, { createdAt: 'desc' }];
    }

    const [items, total] = await Promise.all([
      this.prisma.forumTopic.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit ?? 20,
        include: {
          author: { select: AUTHOR_SELECT },
          channel: { select: { id: true, name: true, slug: true, emoji: true } },
          _count: { select: { replies: true, reactions: true } },
          reactions: { select: { userId: true, emoji: true } },
        },
      }),
      this.prisma.forumTopic.count({ where }),
    ]);

    return {
      items: items.map((t) => ({
        ...t,
        isVendorPost: t.author?.tenantId === tenantId,
        reactionCounts: aggregateReactions(t.reactions),
        myReactions: myReactions(t.reactions, currentUserId),
        reactions: undefined, // strip raw array
      })),
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
  }

  async getTopic(topicId: string, query: QueryTopicsDto, currentUserId?: string) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id: topicId },
      include: {
        author: { select: AUTHOR_SELECT },
        channel: { select: { id: true, name: true, slug: true, emoji: true } },
        reactions: { select: { userId: true, emoji: true } },
      },
    });
    if (!topic) throw new NotFoundException('Topic not found');

    const [replies, replyTotal] = await Promise.all([
      this.prisma.forumReply.findMany({
        where: { topicId, parentReplyId: null }, // top-level only
        orderBy: [{ isArtistAnswer: 'desc' }, { createdAt: 'asc' }],
        skip: query.skip,
        take: query.limit ?? 30,
        include: {
          author: { select: AUTHOR_SELECT },
          reactions: { select: { userId: true, emoji: true } },
          childReplies: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: { select: AUTHOR_SELECT },
              reactions: { select: { userId: true, emoji: true } },
            },
          },
        },
      }),
      this.prisma.forumReply.count({ where: { topicId, parentReplyId: null } }),
    ]);

    return {
      ...topic,
      isVendorPost: topic.author?.tenantId === topic.tenantId,
      reactionCounts: aggregateReactions(topic.reactions),
      myReactions: myReactions(topic.reactions, currentUserId),
      reactions: undefined,
      replies: {
        items: replies.map((r) => ({
          ...r,
          isVendorPost: (r.author as any)?.tenantId === topic.tenantId,
          reactionCounts: aggregateReactions(r.reactions),
          myReactions: myReactions(r.reactions, currentUserId),
          reactions: undefined,
          childReplies: r.childReplies.map((c) => ({
            ...c,
            isVendorPost: (c.author as any)?.tenantId === topic.tenantId,
            reactionCounts: aggregateReactions(c.reactions),
            myReactions: myReactions(c.reactions, currentUserId),
            reactions: undefined,
          })),
        })),
        total: replyTotal,
        page: query.page ?? 1,
        limit: query.limit ?? 30,
      },
    };
  }

  async incrementViewCount(topicId: string) {
    // Fire-and-forget; don't throw if topic is missing
    await this.prisma.forumTopic.updateMany({
      where: { id: topicId },
      data: { viewCount: { increment: 1 } },
    });
  }

  async createTopic(tenantId: string, authorId: string, dto: CreateTopicDto) {
    const settings = await this.getSettings(tenantId);
    if (!settings.enabled) throw new BadRequestException('Forum is disabled for this vendor');
    if (settings.moderationMode === 'LOCKED')
      throw new BadRequestException('Forum is locked — no new topics allowed');

    // Content rule enforcement
    this.enforceContentRules(settings, dto.body, { imageUrl: dto.imageUrl });
    if (dto.title.length < 3 || dto.title.length > 200)
      throw new BadRequestException('Title must be between 3 and 200 characters');

    // Slow mode: prevent posting if user posted within slowModeSeconds
    await this.enforceSlowMode(settings, tenantId, authorId);

    // Validate channel belongs to this tenant if provided
    if (dto.channelId) {
      const channel = await this.prisma.forumChannel.findUnique({ where: { id: dto.channelId } });
      if (!channel || channel.tenantId !== tenantId) throw new BadRequestException('Invalid channel');
    }

    const topic = await this.prisma.forumTopic.create({
      data: {
        tenantId,
        authorId,
        title: dto.title,
        body: dto.body,
        channelId: dto.channelId ?? null,
        imageUrl: dto.imageUrl ?? null,
      },
      include: {
        author: { select: AUTHOR_SELECT },
        channel: { select: { id: true, name: true, slug: true, emoji: true } },
        _count: { select: { replies: true, reactions: true } },
      },
    });

    return { ...topic, isVendorPost: (topic.author as any)?.tenantId === tenantId, reactionCounts: {}, myReactions: [] };
  }

  async createReply(topicId: string, authorId: string, dto: CreateReplyDto) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Topic not found');
    if (topic.locked) throw new BadRequestException('Topic is locked');

    const settings = await this.getSettings(topic.tenantId);
    if (!settings.enabled) throw new BadRequestException('Forum is disabled for this vendor');
    if (!settings.allowReplies) throw new BadRequestException('Replies are disabled in this forum');
    if (settings.moderationMode === 'LOCKED')
      throw new BadRequestException('Forum is locked — no new replies allowed');

    // Content rules + slow mode for replies too
    this.enforceContentRules(settings, dto.body, { imageUrl: dto.imageUrl });
    await this.enforceSlowMode(settings, topic.tenantId, authorId);

    // Validate parentReplyId belongs to same topic
    if (dto.parentReplyId) {
      const parent = await this.prisma.forumReply.findUnique({ where: { id: dto.parentReplyId } });
      if (!parent || parent.topicId !== topicId) throw new BadRequestException('Invalid parent reply');
    }

    const reply = await this.prisma.forumReply.create({
      data: {
        topicId,
        authorId,
        body: dto.body,
        imageUrl: dto.imageUrl ?? null,
        parentReplyId: dto.parentReplyId ?? null,
      },
      include: { author: { select: AUTHOR_SELECT } },
    });

    const isVendorPost = (reply.author as any)?.tenantId === topic.tenantId;

    // If artist replied, set hasArtistReply flag
    if (isVendorPost && !topic.hasArtistReply) {
      await this.prisma.forumTopic.update({ where: { id: topicId }, data: { hasArtistReply: true } });
    }

    // Notify the topic author if someone else replied
    if (topic.authorId && topic.authorId !== authorId) {
      const replyPreview = dto.body.length > 100 ? dto.body.slice(0, 97) + '...' : dto.body;
      await this.push.sendToUser(
        topic.authorId,
        'New Reply',
        replyPreview,
        { type: 'FORUM_REPLY', topicId },
      );
    }

    return { ...reply, isVendorPost, reactionCounts: {}, myReactions: [] };
  }

  // ── Reactions ─────────────────────────────────────────────────────────────────

  async toggleTopicReaction(topicId: string, userId: string, dto: ToggleReactionDto) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Topic not found');

    const existing = await this.prisma.forumReaction.findUnique({
      where: { userId_emoji_topicId: { userId, emoji: dto.emoji, topicId } },
    });

    if (existing) {
      await this.prisma.forumReaction.delete({ where: { id: existing.id } });
      return { toggled: false, emoji: dto.emoji };
    } else {
      await this.prisma.forumReaction.create({ data: { userId, emoji: dto.emoji, topicId } });
      return { toggled: true, emoji: dto.emoji };
    }
  }

  async toggleReplyReaction(replyId: string, userId: string, dto: ToggleReactionDto) {
    const reply = await this.prisma.forumReply.findUnique({ where: { id: replyId } });
    if (!reply) throw new NotFoundException('Reply not found');

    const existing = await this.prisma.forumReaction.findUnique({
      where: { userId_emoji_replyId: { userId, emoji: dto.emoji, replyId } },
    });

    if (existing) {
      await this.prisma.forumReaction.delete({ where: { id: existing.id } });
      return { toggled: false, emoji: dto.emoji };
    } else {
      await this.prisma.forumReaction.create({ data: { userId, emoji: dto.emoji, replyId } });
      return { toggled: true, emoji: dto.emoji };
    }
  }

  // ── Moderation ────────────────────────────────────────────────────────────────

  async togglePin(topicId: string, actorTenantId: string) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Topic not found');
    if (topic.tenantId !== actorTenantId) throw new ForbiddenException();
    return this.prisma.forumTopic.update({ where: { id: topicId }, data: { pinned: !topic.pinned } });
  }

  async toggleLock(topicId: string, actorTenantId: string) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Topic not found');
    if (topic.tenantId !== actorTenantId) throw new ForbiddenException();
    return this.prisma.forumTopic.update({ where: { id: topicId }, data: { locked: !topic.locked } });
  }

  async markArtistAnswer(replyId: string, actorTenantId: string) {
    const reply = await this.prisma.forumReply.findUnique({
      where: { id: replyId },
      include: { topic: true },
    });
    if (!reply) throw new NotFoundException('Reply not found');
    if (reply.topic.tenantId !== actorTenantId) throw new ForbiddenException();

    // Toggle: only one artist answer per topic
    if (reply.isArtistAnswer) {
      await this.prisma.forumReply.update({ where: { id: replyId }, data: { isArtistAnswer: false } });
    } else {
      // Clear any existing answer for this topic
      await this.prisma.forumReply.updateMany({
        where: { topicId: reply.topicId, isArtistAnswer: true },
        data: { isArtistAnswer: false },
      });
      await this.prisma.forumReply.update({ where: { id: replyId }, data: { isArtistAnswer: true } });
    }
    return { marked: !reply.isArtistAnswer };
  }

  async deleteTopic(topicId: string, actorId: string, actorTenantId: string | null, isAdmin: boolean) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Topic not found');
    if (!isAdmin && topic.tenantId !== actorTenantId && topic.authorId !== actorId) {
      throw new ForbiddenException();
    }
    await this.prisma.forumTopic.delete({ where: { id: topicId } });
    await this.audit.log({ actorId, action: 'FORUM_TOPIC_DELETE', targetType: 'ForumTopic', targetId: topicId, metadata: {} });
    return { deleted: true };
  }

  async deleteReply(replyId: string, actorId: string, actorTenantId: string | null, isAdmin: boolean) {
    const reply = await this.prisma.forumReply.findUnique({
      where: { id: replyId },
      include: { topic: true },
    });
    if (!reply) throw new NotFoundException('Reply not found');
    const isVendorMod = actorTenantId && reply.topic.tenantId === actorTenantId;
    if (!isAdmin && !isVendorMod && reply.authorId !== actorId) throw new ForbiddenException();
    await this.prisma.forumReply.delete({ where: { id: replyId } });

    // Recalculate hasArtistReply if artist reply was deleted
    const vendorRepliesLeft = await this.prisma.forumReply.count({
      where: {
        topicId: reply.topicId,
        author: { tenantId: reply.topic.tenantId },
      },
    });
    if (vendorRepliesLeft === 0) {
      await this.prisma.forumTopic.update({ where: { id: reply.topicId }, data: { hasArtistReply: false } });
    }

    await this.audit.log({ actorId, action: 'FORUM_REPLY_DELETE', targetType: 'ForumReply', targetId: replyId, metadata: {} });
    return { deleted: true };
  }

  // ── Sub-settings enforcement helpers ──────────────────────────────────────

  /**
   * Validates a single forum post/reply body against the vendor's forum settings.
   * - Min/max length
   * - Image / link / mention allow flags (rejects body containing them when disabled)
   * - Banned keyword substring match (case-insensitive)
   */
  private enforceContentRules(
    settings: any,
    body: string,
    extras: { imageUrl?: string | null } = {},
  ) {
    const trimmed = (body ?? '').trim();
    if (trimmed.length < settings.minPostLength)
      throw new BadRequestException(`Post must be at least ${settings.minPostLength} character(s)`);
    if (trimmed.length > settings.maxPostLength)
      throw new BadRequestException(`Post must be at most ${settings.maxPostLength} characters`);

    if (extras.imageUrl && !settings.allowImages)
      throw new BadRequestException('Images are not allowed in this forum');

    // Cheap link detection: presence of "http://" or "https://" or "www."
    if (!settings.allowLinks && /(https?:\/\/|www\.)/i.test(trimmed))
      throw new BadRequestException('Links are not allowed in this forum');

    // Mention detection: @something at word boundary
    if (!settings.allowMentions && /(^|\s)@[a-z0-9_-]+/i.test(trimmed))
      throw new BadRequestException('Mentions are not allowed in this forum');

    // Banned keywords (case-insensitive substring match)
    if (Array.isArray(settings.bannedKeywords) && settings.bannedKeywords.length > 0) {
      const lower = trimmed.toLowerCase();
      const hit = settings.bannedKeywords.find((kw: string) =>
        kw && lower.includes(kw.toLowerCase()),
      );
      if (hit) throw new BadRequestException(`Content contains a banned term: "${hit}"`);
    }
  }

  /**
   * Slow mode: forbid posting if the user posted within the last
   * settings.slowModeSeconds in this tenant's forum (topic or reply).
   * Returns silently when slow mode is disabled (0).
   */
  private async enforceSlowMode(settings: any, tenantId: string, authorId: string) {
    const slow = settings.slowModeSeconds ?? 0;
    if (!slow || slow <= 0) return;

    const cutoff = new Date(Date.now() - slow * 1000);
    const [recentTopic, recentReply] = await Promise.all([
      this.prisma.forumTopic.findFirst({
        where: { tenantId, authorId, createdAt: { gte: cutoff } },
        select: { createdAt: true },
      }),
      this.prisma.forumReply.findFirst({
        where: { authorId, topic: { tenantId }, createdAt: { gte: cutoff } },
        select: { createdAt: true },
      }),
    ]);
    const last = [recentTopic?.createdAt, recentReply?.createdAt]
      .filter(Boolean)
      .sort((a: any, b: any) => b.getTime() - a.getTime())[0];
    if (last) {
      const waitMs = slow * 1000 - (Date.now() - (last as Date).getTime());
      const waitSec = Math.max(1, Math.ceil(waitMs / 1000));
      throw new BadRequestException(
        `Slow mode is active — please wait ${waitSec}s before posting again`,
      );
    }
  }
}
