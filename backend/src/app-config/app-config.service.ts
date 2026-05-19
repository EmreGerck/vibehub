import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<any | null> {
    const record = await this.prisma.appConfig.findUnique({ where: { key } });
    return record?.value ?? null;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.prisma.appConfig.upsert({
      where: { key },
      create: { key, value: value as any },
      update: { value: value as any },
    });
  }

  async getAll(): Promise<Record<string, any>> {
    const records = await this.prisma.appConfig.findMany();
    return Object.fromEntries(records.map((r) => [r.key, r.value]));
  }
}
