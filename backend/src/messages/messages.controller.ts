import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/message.dto';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '../common/response.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly svc: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'List all conversations (unique partners + last message)' })
  async listConversations(@CurrentUser('id') userId: string) {
    return ApiResponse.ok(await this.svc.listConversations(userId));
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get message thread with a specific user (includes partner profile)' })
  async getThread(
    @CurrentUser('id') myId: string,
    @Param('userId') otherId: string,
  ) {
    return ApiResponse.ok(await this.svc.getThread(myId, otherId));
  }

  @Get('partner/:userId/profile')
  @ApiOperation({ summary: 'Get basic profile info for a message partner' })
  async getPartnerProfile(@Param('userId') otherId: string) {
    return ApiResponse.ok(await this.svc.getPartnerProfile(otherId));
  }

  @Post(':userId')
  @ApiOperation({ summary: 'Send a message to a user' })
  async send(
    @CurrentUser('id') myId: string,
    @Param('userId') recipientId: string,
    @Body() dto: SendMessageDto,
  ) {
    return ApiResponse.ok(await this.svc.sendMessage(myId, recipientId, dto), 'Message sent');
  }

  @Get('admin/all')
  @Roles(UserRole.GOD_USER)
  @ApiOperation({ summary: 'Admin: view all messages' })
  async adminAll(@Query('page') page = 1, @Query('limit') limit = 30) {
    return ApiResponse.ok(await this.svc.adminListAll(+page, +limit));
  }
}
