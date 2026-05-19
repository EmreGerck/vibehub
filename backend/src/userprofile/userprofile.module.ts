import { Module } from '@nestjs/common';
import { UserProfileController } from './userprofile.controller';
import { UserProfileService } from './userprofile.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserProfileController],
  providers: [UserProfileService],
  exports: [UserProfileService],
})
export class UserProfileModule {}
