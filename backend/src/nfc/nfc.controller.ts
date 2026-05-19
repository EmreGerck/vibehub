import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { NfcService } from './nfc.service';
import { CreateNfcTagDto, UpdateNfcTagDto, QueryNfcTagsDto, BulkUpdateDestinationDto } from './dto/nfc.dto';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { Public } from '../common/public.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiResponse } from '../common/response.dto';

@ApiTags('NFC')
@Controller('nfc')
export class NfcController {
  constructor(private readonly nfcService: NfcService) {}

  // ── Public redirect ──────────────────────────────────────────────────────────

  @Public()
  @Get('redirect/:tagId')
  @ApiOperation({ summary: 'Redirect NFC tag to destination URL (302)' })
  async redirect(@Param('tagId') tagId: string, @Res() res: Response) {
    const destination = await this.nfcService.handleRedirect(tagId);
    if (!destination) {
      return res.status(404).send('<h1>NFC tag not found or disabled</h1>');
    }
    return res.redirect(302, destination);
  }

  @Public()
  @Get('resolve/:tagId')
  @ApiOperation({ summary: 'Resolve NFC tag info + increment scan count (JSON, for frontend use)' })
  async resolve(@Param('tagId') tagId: string) {
    const destination = await this.nfcService.handleRedirect(tagId);
    if (!destination) throw new NotFoundException('NFC tag not found or disabled');
    return ApiResponse.ok({ destinationUrl: destination });
  }

  // ── Admin endpoints ───────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Get('tags')
  @ApiOperation({ summary: 'List all NFC tags' })
  async listTags(@Query() query: QueryNfcTagsDto) {
    return ApiResponse.ok(await this.nfcService.listTags(query));
  }

  @ApiBearerAuth()
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Get('tags/:id')
  @ApiOperation({ summary: 'Get single NFC tag' })
  async getTag(@Param('id') id: string) {
    return ApiResponse.ok(await this.nfcService.getTag(id));
  }

  @ApiBearerAuth()
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Post('tags')
  @ApiOperation({ summary: 'Create NFC tag' })
  async createTag(@Body() dto: CreateNfcTagDto, @CurrentUser('id') actorId: string) {
    return ApiResponse.ok(await this.nfcService.createTag(dto, actorId), 'NFC tag created');
  }

  @ApiBearerAuth()
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Patch('tags/:id')
  @ApiOperation({ summary: 'Update NFC tag' })
  async updateTag(
    @Param('id') id: string,
    @Body() dto: UpdateNfcTagDto,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.nfcService.updateTag(id, dto, actorId), 'NFC tag updated');
  }

  @ApiBearerAuth()
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Delete('tags/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete NFC tag' })
  async deleteTag(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return ApiResponse.ok(await this.nfcService.deleteTag(id, actorId), 'NFC tag deleted');
  }

  @ApiBearerAuth()
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Post('tags/:id/reset-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset NFC tag scan counter' })
  async resetCount(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return ApiResponse.ok(await this.nfcService.resetScanCount(id, actorId), 'Scan count reset');
  }

  @ApiBearerAuth()
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Post('tags/bulk-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update destination URL for all tags of a vendor' })
  async bulkUpdate(@Body() dto: BulkUpdateDestinationDto, @CurrentUser('id') actorId: string) {
    return ApiResponse.ok(await this.nfcService.bulkUpdateByTenant(dto, actorId), 'Bulk update complete');
  }
}
