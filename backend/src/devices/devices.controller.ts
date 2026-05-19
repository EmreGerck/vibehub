import { Controller, Post, Delete, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DevicePlatform } from '@prisma/client';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { DevicesService } from './devices.service';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiResponse } from '../common/response.dto';

class RegisterDeviceDto {
  @IsString() token: string;
  @IsEnum(DevicePlatform) platform: DevicePlatform;
  @IsOptional() @IsString() appVersion?: string;
}

class RemoveDeviceDto {
  @IsString() token: string;
}

@ApiTags('Devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register or refresh a push notification token' })
  async register(@CurrentUser() user: any, @Body() dto: RegisterDeviceDto) {
    await this.devicesService.register(user.id, dto);
    return ApiResponse.ok(null, 'Device registered');
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unregister a push token (on logout)' })
  async remove(@CurrentUser() user: any, @Body() dto: RemoveDeviceDto) {
    await this.devicesService.removeStale(user.id, dto.token);
    return ApiResponse.ok(null, 'Device removed');
  }
}
