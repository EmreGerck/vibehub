import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserProfileService } from './userprofile.service';
import { UpdateUserProfileDto } from './dto/userprofile.dto';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { ApiResponse } from '../common/response.dto';

@ApiTags('UserProfile')
@Controller('user-profile')
export class UserProfileController {
  constructor(private readonly svc: UserProfileService) {}

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get own social profile (auto-creates on first access)' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return ApiResponse.ok(await this.svc.getMyProfile(userId));
  }

  @ApiBearerAuth()
  @Patch('me')
  @ApiOperation({ summary: 'Update own social profile' })
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return ApiResponse.ok(await this.svc.updateMyProfile(userId, dto), 'Profile updated');
  }

  @ApiBearerAuth()
  @Get('me/visitors')
  @ApiOperation({ summary: 'Who visited my profile (deduped, ghost mode respected)' })
  async getMyVisitors(@CurrentUser('id') userId: string) {
    return ApiResponse.ok(await this.svc.getMyVisitors(userId));
  }

  @Public()
  @Get(':nickname')
  @ApiOperation({ summary: 'Get a public profile by nickname (records visit if logged in)' })
  async getPublicProfile(
    @Param('nickname') nickname: string,
    @CurrentUser('id') viewerId: string,
  ) {
    return ApiResponse.ok(await this.svc.getPublicProfile(nickname, viewerId));
  }
}
