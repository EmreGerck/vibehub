import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { CreateMediaDto, UpdateMediaDto } from './dto/media.dto';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { RequirePermissions } from '../permissions/permissions.decorator';
import { UserRole, VendorPermission } from '@prisma/client';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiResponse } from '../common/response.dto';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // ── Public ───────────────────────────────────────────────────────────────────

  @Public()
  @Get(':tenantId')
  @ApiOperation({ summary: 'List active media embeds for a vendor' })
  async listPublic(@Param('tenantId') tenantId: string) {
    return ApiResponse.ok(await this.mediaService.listPublic(tenantId));
  }

  // ── Vendor ───────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.MEDIA_MANAGE)
  @Get('mine/list')
  @ApiOperation({ summary: 'List own media embeds' })
  async listMine(@CurrentUser('tenantId') tenantId: string) {
    return ApiResponse.ok(await this.mediaService.listForVendor(tenantId));
  }

  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.MEDIA_MANAGE)
  @Post()
  @ApiOperation({ summary: 'Add a media embed' })
  async create(
    @Body() dto: CreateMediaDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.mediaService.create(tenantId, dto, actorId), 'Media added');
  }

  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.MEDIA_MANAGE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update own media embed' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMediaDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.mediaService.update(id, dto, actorId, tenantId), 'Media updated');
  }

  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.MEDIA_MANAGE)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete own media embed' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.mediaService.delete(id, actorId, tenantId), 'Media deleted');
  }
}
