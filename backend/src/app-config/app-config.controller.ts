import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppConfigService } from './app-config.service';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '../common/response.dto';

@ApiTags('AppConfig')
@Controller()
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Public()
  @Get('app-config')
  @ApiOperation({ summary: 'Get all app config (mobile startup fetch)' })
  async getAll() {
    const data = await this.appConfigService.getAll();
    return ApiResponse.ok(data, 'App config retrieved');
  }

  @Public()
  @Get('app-config/:key')
  @ApiOperation({ summary: 'Get a single app config value by key' })
  async getOne(@Param('key') key: string) {
    const value = await this.appConfigService.get(key);
    if (value === null) throw new NotFoundException(`Config key '${key}' not found`);
    return ApiResponse.ok(value, 'App config value retrieved');
  }

  @ApiBearerAuth()
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Put('admin/app-config/:key')
  @ApiOperation({ summary: 'Upsert an app config value (admin only)' })
  async upsert(@Param('key') key: string, @Body() body: { value: unknown }) {
    await this.appConfigService.set(key, body.value);
    return ApiResponse.ok(null, `App config key '${key}' updated`);
  }
}
