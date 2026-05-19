import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DevicePlatform } from '@prisma/client';

export interface RegisterDeviceDto {
  token: string;
  platform: DevicePlatform;
  appVersion?: string;
}

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterDeviceDto) {
    // Upsert by token — if the token already exists update lastUsed and owner
    return this.prisma.pushDevice.upsert({
      where: { token: dto.token },
      create: {
        userId,
        token: dto.token,
        platform: dto.platform,
        appVersion: dto.appVersion,
      },
      update: {
        userId,
        appVersion: dto.appVersion,
        lastUsed: new Date(),
      },
    });
  }

  async removeStale(userId: string, token: string) {
    await this.prisma.pushDevice.deleteMany({ where: { userId, token } });
  }

  async getTokensForUser(userId: string): Promise<string[]> {
    const devices = await this.prisma.pushDevice.findMany({
      where: { userId },
      select: { token: true },
    });
    return devices.map((d) => d.token);
  }
}
