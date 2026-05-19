import { Injectable, Logger } from '@nestjs/common';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class PushService {
  private readonly expo = new Expo();
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly devicesService: DevicesService) {}

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const tokens = await this.devicesService.getTokensForUser(userId);

    const validMessages: ExpoPushMessage[] = tokens
      .filter((token) => Expo.isExpoPushToken(token))
      .map((token) => ({ to: token, title, body, data: data ?? {} }));

    if (validMessages.length === 0) return;

    const chunks = this.expo.chunkPushNotifications(validMessages);

    for (const chunk of chunks) {
      try {
        const receipts = await this.expo.sendPushNotificationsAsync(chunk);
        for (const receipt of receipts) {
          if (receipt.status === 'error') {
            this.logger.error(
              `Push receipt error: ${receipt.message}`,
              receipt.details?.error,
            );
          }
        }
      } catch (err) {
        this.logger.error(`Failed to send push chunk to user ${userId}`, err);
      }
    }
  }

  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    await Promise.all(userIds.map((id) => this.sendToUser(id, title, body, data)));
  }
}
