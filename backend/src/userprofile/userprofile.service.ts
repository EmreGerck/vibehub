import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserProfileDto } from './dto/userprofile.dto';

@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get or auto-create the social profile for the current user */
  async getMyProfile(userId: string) {
    let profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      const nickname = await this.generateNickname(user!.email);
      profile = await this.prisma.userProfile.create({ data: { userId, nickname } });
    }
    return profile;
  }

  async updateMyProfile(userId: string, dto: UpdateUserProfileDto) {
    await this.getMyProfile(userId); // ensure exists

    if (dto.nickname) {
      const existing = await this.prisma.userProfile.findUnique({ where: { nickname: dto.nickname } });
      if (existing && existing.userId !== userId) {
        throw new ConflictException('Nickname already taken');
      }
    }

    return this.prisma.userProfile.update({
      where: { userId },
      data: {
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.interests !== undefined && { interests: dto.interests }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.bannerUrl !== undefined && { bannerUrl: dto.bannerUrl }),
        ...(dto.ghostMode !== undefined && { ghostMode: dto.ghostMode }),
      },
    });
  }

  /** Public profile view — records a visit if viewerId is set and not self */
  async getPublicProfile(nickname: string, viewerId?: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { nickname },
      include: {
        user: { select: { id: true, role: true, createdAt: true } },
      },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    if (viewerId && viewerId !== profile.userId) {
      // Record visit (fire-and-forget; don't let it block response)
      this.prisma.profileVisit.create({
        data: { visitorId: viewerId, profileUserId: profile.userId },
      }).catch(() => {});
    }

    return profile;
  }

  /** Who visited my profile — deduplicated, most recent first, skips ghost-mode visitors */
  async getMyVisitors(userId: string) {
    const visits = await this.prisma.profileVisit.findMany({
      where: { profileUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        visitor: {
          select: {
            id: true,
            socialProfile: { select: { nickname: true, avatarUrl: true, ghostMode: true } },
          },
        },
      },
    });

    const seen = new Set<string>();
    return visits
      .filter((v) => {
        if (seen.has(v.visitorId)) return false;
        if (v.visitor.socialProfile?.ghostMode) return false;
        seen.add(v.visitorId);
        return true;
      })
      .map((v) => ({
        userId: v.visitorId,
        nickname: v.visitor.socialProfile?.nickname ?? null,
        avatarUrl: v.visitor.socialProfile?.avatarUrl ?? null,
        visitedAt: v.createdAt,
      }));
  }

  private async generateNickname(email: string): Promise<string> {
    const base = email
      .split('@')[0]
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 20);
    let candidate = base;
    let attempt = 0;
    while (await this.prisma.userProfile.findUnique({ where: { nickname: candidate } })) {
      attempt++;
      candidate = `${base}${attempt}`;
    }
    return candidate;
  }
}
