import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VendorModule } from './vendor/vendor.module';
import { ProductModule } from './product/product.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { AuditModule } from './audit/audit.module';
import { BannerModule } from './banner/banner.module';
import { ReviewModule } from './review/review.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { PayoutModule } from './payout/payout.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/roles.guard';
import { PermissionsModule } from './permissions/permissions.module';
import { PermissionsGuard } from './permissions/permissions.guard';
import { MailModule } from './mail/mail.module';
import { NfcModule } from './nfc/nfc.module';
import { MediaModule } from './media/media.module';
import { ForumModule } from './forum/forum.module';
import { CategoryModule } from './category/category.module';
import { UserProfileModule } from './userprofile/userprofile.module';
import { MessagesModule } from './messages/messages.module';
import { DevicesModule } from './devices/devices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FeedModule } from './feed/feed.module';
import { PushModule } from './push/push.module';
import { AppConfigModule } from './app-config/app-config.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    VendorModule,
    ProductModule,
    CartModule,
    OrderModule,
    PaymentModule,
    AdminModule,
    QueueModule,
    StorageModule,
    AuditModule,
    BannerModule,
    ReviewModule,
    WishlistModule,
    PermissionsModule,
    PayoutModule,
    MailModule,
    NfcModule,
    MediaModule,
    ForumModule,
    CategoryModule,
    UserProfileModule,
    MessagesModule,
    DevicesModule,
    NotificationsModule,
    FeedModule,
    PushModule,
    AppConfigModule,
  ],
  providers: [
    // All routes are JWT-protected by default; decorate with @Public() to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Role enforcement runs after authentication
    { provide: APP_GUARD, useClass: RolesGuard },
    // Per-tenant micro-permission enforcement (after roles)
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Rate-limit every route
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
