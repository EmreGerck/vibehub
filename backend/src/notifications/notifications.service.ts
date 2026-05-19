import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.appNotification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        data: dto.data ?? {},
      },
    });
  }

  async findForUser(userId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.appNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.appNotification.count({ where: { userId } }),
    ]);
    return { data: items, total, page, limit, hasMore: skip + items.length < total };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.appNotification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.appNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.appNotification.count({ where: { userId, readAt: null } });
  }

  async broadcastPush(title: string, body: string): Promise<void> {
    // Get all users who have at least one registered push device
    const devices = await this.prisma.pushDevice.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });
    const userIds = devices.map((d) => d.userId);
    if (userIds.length === 0) return;
    await this.pushService.sendToUsers(userIds, title, body);
  }
}
