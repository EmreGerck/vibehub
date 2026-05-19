import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '../common/response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated in-app notifications for the current user' })
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    const result = await this.notificationsService.findForUser(
      user.id,
      parseInt(page),
      parseInt(limit),
    );
    return ApiResponse.ok(result, 'Notifications retrieved');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  async unreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.unreadCount(user.id);
    return ApiResponse.ok({ count }, 'Unread count');
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: any) {
    await this.notificationsService.markAllRead(user.id);
    return ApiResponse.ok(null, 'All notifications marked as read');
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markRead(@CurrentUser() user: any, @Param('id') id: string) {
    await this.notificationsService.markRead(user.id, id);
    return ApiResponse.ok(null, 'Notification marked as read');
  }
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('push-broadcast')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Broadcast a push notification to all users with registered devices' })
  async pushBroadcast(@Body() body: { title: string; body: string }) {
    await this.notificationsService.broadcastPush(body.title, body.body);
    return ApiResponse.ok(null, 'Push notification broadcast sent');
  }
}
