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

  // Reads: PLATFORM_ADMIN may see the catalogue so the product editor's
  // mfg-unit picker can render names. Costs themselves are still surfaced
  // to ADMIN; if this becomes a leakage concern later, narrow read access.
  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Get()
  @ApiOperation({ summary: 'List manufacturing units (admin)' })
  async list(@Query('includeInactive') includeInactive?: string) {
    const data = await this.mfg.list(includeInactive === 'true');
    return ApiResponse.ok(data, 'Manufacturing units retrieved');
  }

  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get one manufacturing unit (admin)' })
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
