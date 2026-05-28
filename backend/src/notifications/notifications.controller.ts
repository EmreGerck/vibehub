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
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '../common/response.dto';
import { AuditService } from '../audit/audit.service';

class PushBroadcastDto {
  @IsString() @MinLength(1) @MaxLength(50) title: string;
  @IsString() @MinLength(1) @MaxLength(160) body: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated in-app notifications for the current user' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
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
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.notificationsService.unreadCount(user.id);
    return ApiResponse.ok({ count }, 'Unread count');
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    await this.notificationsService.markAllRead(user.id);
    return ApiResponse.ok(null, 'All notifications marked as read');
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.notificationsService.markRead(user.id, id);
    return ApiResponse.ok(null, 'Notification marked as read');
  }
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  @Post('push-broadcast')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @ApiOperation({ summary: 'Broadcast a push notification to all users with registered devices (5/hr per admin, audit-logged)' })
  async pushBroadcast(@Body() dto: PushBroadcastDto, @CurrentUser() user: AuthenticatedUser) {
    await this.notificationsService.broadcastPush(dto.title, dto.body);
    // Audit-log every broadcast — blast radius = every user with a device token
    await this.audit.log({
      actorId: user.id,
      action: 'ADMIN_PUSH_BROADCAST',
      targetType: 'PushNotification',
      targetId: 'broadcast',
      metadata: { title: dto.title, bodyLength: dto.body.length },
    });
    return ApiResponse.ok(null, 'Push notification broadcast sent');
  }
}
