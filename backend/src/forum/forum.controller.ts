import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ForumService } from './forum.service';
import {
  CreateTopicDto, CreateReplyDto, UpdateForumSettingsDto, QueryTopicsDto,
  CreateChannelDto, UpdateChannelDto, ToggleReactionDto,
} from './dto/forum.dto';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { RequirePermissions } from '../permissions/permissions.decorator';
import { UserRole, VendorPermission } from '@prisma/client';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiResponse } from '../common/response.dto';

@ApiTags('Forum')
@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  // ── Channels (public read) ────────────────────────────────────────────────────

  @Public()
  @Get(':tenantId/channels')
  @ApiOperation({ summary: 'List channels for a vendor forum' })
  async listChannels(@Param('tenantId') tenantId: string) {
    return ApiResponse.ok(await this.forumService.getChannels(tenantId));
  }

  // ── Topics (public read) ──────────────────────────────────────────────────────

  @Public()
  @Get(':tenantId/topics')
  @ApiOperation({ summary: 'List forum topics for a vendor' })
  async listTopics(
    @Param('tenantId') tenantId: string,
    @Query() query: QueryTopicsDto,
    @Req() req: Request,
  ) {
    const currentUserId = (req as any).user?.id;
    return ApiResponse.ok(await this.forumService.listTopics(tenantId, query, currentUserId));
  }

  @Public()
  @Get('topics/:topicId')
  @ApiOperation({ summary: 'Get topic with replies' })
  async getTopic(
    @Param('topicId') topicId: string,
    @Query() query: QueryTopicsDto,
    @Req() req: Request,
  ) {
    const currentUserId = (req as any).user?.id;
    // Fire-and-forget view increment
    this.forumService.incrementViewCount(topicId).catch(() => {});
    return ApiResponse.ok(await this.forumService.getTopic(topicId, query, currentUserId));
  }

  // ── Authenticated ─────────────────────────────────────────────────────────────

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiBearerAuth()
  @Post(':tenantId/topics')
  @ApiOperation({ summary: 'Create a forum topic' })
  async createTopic(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateTopicDto,
    @CurrentUser('id') authorId: string,
  ) {
    return ApiResponse.ok(await this.forumService.createTopic(tenantId, authorId, dto), 'Topic created');
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiBearerAuth()
  @Post('topics/:topicId/replies')
  @ApiOperation({ summary: 'Reply to a topic' })
  async createReply(
    @Param('topicId') topicId: string,
    @Body() dto: CreateReplyDto,
    @CurrentUser('id') authorId: string,
  ) {
    return ApiResponse.ok(await this.forumService.createReply(topicId, authorId, dto), 'Reply posted');
  }

  // ── Reactions ─────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Post('topics/:topicId/reactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle reaction on a topic' })
  async toggleTopicReaction(
    @Param('topicId') topicId: string,
    @Body() dto: ToggleReactionDto,
    @CurrentUser('id') userId: string,
  ) {
    return ApiResponse.ok(await this.forumService.toggleTopicReaction(topicId, userId, dto));
  }

  @ApiBearerAuth()
  @Post('replies/:replyId/reactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle reaction on a reply' })
  async toggleReplyReaction(
    @Param('replyId') replyId: string,
    @Body() dto: ToggleReactionDto,
    @CurrentUser('id') userId: string,
  ) {
    return ApiResponse.ok(await this.forumService.toggleReplyReaction(replyId, userId, dto));
  }

  // ── Vendor (moderation) ────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.FORUM_MANAGE)
  @Get('settings')
  @ApiOperation({ summary: 'Get own forum settings' })
  async getSettings(@CurrentUser('tenantId') tenantId: string) {
    return ApiResponse.ok(await this.forumService.getSettings(tenantId));
  }

  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.FORUM_MANAGE)
  @Patch('settings')
  @ApiOperation({ summary: 'Update own forum settings' })
  async updateSettings(
    @Body() dto: UpdateForumSettingsDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.forumService.updateSettings(tenantId, dto, actorId), 'Settings saved');
  }

  // ── Channel management (vendor) ───────────────────────────────────────────────

  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.FORUM_MANAGE)
  @Post('channels')
  @ApiOperation({ summary: 'Create a forum channel' })
  async createChannel(
    @Body() dto: CreateChannelDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.forumService.createChannel(tenantId, dto, actorId), 'Channel created');
  }

  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.FORUM_MANAGE)
  @Patch('channels/:channelId')
  @ApiOperation({ summary: 'Update a forum channel' })
  async updateChannel(
    @Param('channelId') channelId: string,
    @Body() dto: UpdateChannelDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.forumService.updateChannel(channelId, tenantId, dto, actorId), 'Channel updated');
  }

  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.FORUM_MANAGE)
  @Delete('channels/:channelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a forum channel' })
  async deleteChannel(
    @Param('channelId') channelId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.forumService.deleteChannel(channelId, tenantId, actorId));
  }

  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.FORUM_MANAGE)
  @Patch('topics/:topicId/pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle pin on a topic' })
  async togglePin(
    @Param('topicId') topicId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return ApiResponse.ok(await this.forumService.togglePin(topicId, tenantId));
  }

  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.FORUM_MANAGE)
  @Patch('topics/:topicId/lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle lock on a topic' })
  async toggleLock(
    @Param('topicId') topicId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return ApiResponse.ok(await this.forumService.toggleLock(topicId, tenantId));
  }

  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.FORUM_MANAGE)
  @Patch('replies/:replyId/mark-answer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark reply as artist answer (Q&A pin)' })
  async markArtistAnswer(
    @Param('replyId') replyId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return ApiResponse.ok(await this.forumService.markArtistAnswer(replyId, tenantId));
  }

  @ApiBearerAuth()
  @Delete('topics/:topicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a topic (vendor mod, author, or admin)' })
  async deleteTopic(
    @Param('topicId') topicId: string,
    @CurrentUser('id') actorId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') role: string,
  ) {
    const isAdmin = ['GOD_USER', 'PLATFORM_ADMIN'].includes(role);
    return ApiResponse.ok(await this.forumService.deleteTopic(topicId, actorId, tenantId, isAdmin));
  }

  @ApiBearerAuth()
  @Delete('replies/:replyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a reply (vendor mod, author, or admin)' })
  async deleteReply(
    @Param('replyId') replyId: string,
    @CurrentUser('id') actorId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') role: string,
  ) {
    const isAdmin = ['GOD_USER', 'PLATFORM_ADMIN'].includes(role);
    return ApiResponse.ok(await this.forumService.deleteReply(replyId, actorId, tenantId, isAdmin));
  }
}
