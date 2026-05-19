import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/message.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  /** List conversation partners — one entry per unique person, with latest message preview */
  async listConversations(userId: string) {
    // Get all messages involving this user
    const messages = await this.prisma.directMessage.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, socialProfile: { select: { nickname: true, avatarUrl: true } } } },
        recipient: { select: { id: true, socialProfile: { select: { nickname: true, avatarUrl: true } } } },
      },
    });

    // Deduplicate by conversation partner, keep most recent message
    const seen = new Map<string, any>();
    for (const msg of messages) {
      const otherId = msg.senderId === userId ? msg.recipientId : msg.senderId;
      if (!seen.has(otherId)) {
        const other = msg.senderId === userId ? msg.recipient : msg.sender;
        const unread = await this.prisma.directMessage.count({
          where: { senderId: otherId, recipientId: userId, readAt: null },
        });
        seen.set(otherId, {
          userId: otherId,
          nickname: other.socialProfile?.nickname ?? null,
          avatarUrl: other.socialProfile?.avatarUrl ?? null,
          lastMessage: msg.body,
          lastMessageAt: msg.createdAt,
          unread,
        });
      }
    }
    return Array.from(seen.values());
  }

  /** Get thread between two users — caller must be one of the two parties */
  async getThread(userId: string, otherId: string) {
    // Verify the caller is actually a participant
    if (userId === otherId) throw new ForbiddenException('Cannot message yourself');

    const messages = await this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: otherId },
          { senderId: otherId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark unread messages as read
    await this.prisma.directMessage.updateMany({
      where: { senderId: otherId, recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });

    // Return partner profile info alongside messages
    const partner = await this.prisma.user.findUnique({
      where: { id: otherId },
      select: {
        id: true,
        socialProfile: { select: { nickname: true, avatarUrl: true } },
      },
    });

    return {
      messages,
      partner: {
        id: otherId,
        nickname: partner?.socialProfile?.nickname ?? null,
        avatarUrl: partner?.socialProfile?.avatarUrl ?? null,
      },
    };
  }

  /** Send a message — only CUSTOMER role can DM (or GOD_USER for admin) */
  async sendMessage(senderId: string, recipientId: string, dto: SendMessageDto) {
    const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { role: true } });
    const recipient = await this.prisma.user.findUnique({ where: { id: recipientId }, select: { role: true } });

    if (!recipient) throw new NotFoundException('User not found');

    const allowedRoles: UserRole[] = [UserRole.CUSTOMER, UserRole.GOD_USER];
    if (!sender || !allowedRoles.includes(sender.role)) {
      throw new ForbiddenException('Only customers can send direct messages');
    }
    if (!allowedRoles.includes(recipient.role)) {
      throw new ForbiddenException('Cannot send messages to this user type');
    }

    return this.prisma.directMessage.create({
      data: { senderId, recipientId, body: dto.body },
    });
  }

  /** Fetch lightweight profile for a conversation partner */
  async getPartnerProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, socialProfile: { select: { nickname: true, avatarUrl: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      nickname: user.socialProfile?.nickname ?? null,
      avatarUrl: user.socialProfile?.avatarUrl ?? null,
    };
  }

  /** Admin: all conversations system-wide */
  async adminListAll(page = 1, limit = 30) {
    const [items, total] = await Promise.all([
      this.prisma.directMessage.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { id: true, email: true, socialProfile: { select: { nickname: true } } } },
          recipient: { select: { id: true, email: true, socialProfile: { select: { nickname: true } } } },
        },
      }),
      this.prisma.directMessage.count(),
    ]);
    return { items, total };
  }
}
