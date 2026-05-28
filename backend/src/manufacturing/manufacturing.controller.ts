import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ManufacturingService } from './manufacturing.service';
import {
  CreateManufacturingUnitDto,
  UpdateManufacturingUnitDto,
} from './dto/manufacturing.dto';
import { Roles } from '../common/roles.decorator';
import { ApiResponse } from '../common/response.dto';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Manufacturing')
@ApiBearerAuth()
@Controller('admin/manufacturing-units')
export class ManufacturingController {
  constructor(private readonly mfg: ManufacturingService) {}

  // Reads: GOD_USER only. Sprint 13 audit pulled this back from "ADMIN+"
  // because PLATFORM_ADMIN could read `unitCostTRY` which is internal
  // commercial info. The product editor's mfg-unit picker is also gated
  // GOD_USER on the frontend (the 🏭 button only renders for GOD_USER),
  // so PLATFORM_ADMIN never needs to call this in practice.
  @Roles(UserRole.GOD_USER)
  @Get()
  @ApiOperation({ summary: 'List manufacturing units (god-user only)' })
  async list(@Query('includeInactive') includeInactive?: string) {
    const data = await this.mfg.list(includeInactive === 'true');
    return ApiResponse.ok(data, 'Manufacturing units retrieved');
  }

  @Roles(UserRole.GOD_USER)
  @Get(':id')
  @ApiOperation({ summary: 'Get one manufacturing unit (god-user only)' })
  async findOne(@Param('id') id: string) {
    const data = await this.mfg.findOne(id);
    return ApiResponse.ok(data, 'Manufacturing unit retrieved');
  }

  // Writes are GOD_USER only — unit cost drives money math and is sensitive.
  @Roles(UserRole.GOD_USER)
  @Post()
  @ApiOperation({ summary: 'Create a manufacturing unit (god-user only)' })
  async create(
    @Body() dto: CreateManufacturingUnitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.mfg.create(dto, user.id);
    return ApiResponse.ok(data, 'Manufacturing unit created');
  }

  @Roles(UserRole.GOD_USER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a manufacturing unit (god-user only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateManufacturingUnitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.mfg.update(id, dto, user.id);
    return ApiResponse.ok(data, 'Manufacturing unit updated');
  }

  @Roles(UserRole.GOD_USER)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a manufacturing unit (god-user only)' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.mfg.remove(id, user.id);
    return ApiResponse.ok(data, 'Manufacturing unit deleted');
  }
}
