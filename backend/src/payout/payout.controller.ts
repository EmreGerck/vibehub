import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, VendorPermission } from '@prisma/client';
import { PayoutService } from './payout.service';
import {
  CreatePayoutDto,
  UpdatePayoutStatusDto,
  QueryPayoutsDto,
} from './dto/payout.dto';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiResponse } from '../common/response.dto';
import { RequirePermissions } from '../permissions/permissions.decorator';

@ApiTags('Payouts')
@ApiBearerAuth()
@Controller('payouts')
export class PayoutController {
  constructor(private readonly payouts: PayoutService) {}

  // ── Vendor: own payouts ──────────────────────────────────────────────────

  @Get('mine')
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.PAYOUT_REQUEST)
  @ApiOperation({ summary: "List the caller's own payouts" })
  async listMine(@Query() query: QueryPayoutsDto, @CurrentUser() user: any) {
    if (!user.tenantId) {
      return ApiResponse.ok({ items: [], total: 0, page: 1, limit: query.limit ?? 20 }, 'No store');
    }
    const data = await this.payouts.listForTenant(user.tenantId, query);
    return ApiResponse.ok(data, 'Payouts retrieved');
  }

  @Post('request')
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.PAYOUT_REQUEST)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Vendor requests a payout for everything DELIVERED since their last payout. ' +
      'Period is computed automatically; amounts are auto-summed from order items.',
  })
  async requestMine(@CurrentUser() user: any) {
    if (!user.tenantId) {
      throw new (await import('@nestjs/common').then((m) => m.BadRequestException))(
        'Bu hesabın bir mağazası yok — payout talep edilemez.',
      );
    }
    const data = await this.payouts.requestForTenant(user.tenantId, user.id);
    return ApiResponse.ok(data, 'Payout talebin alındı — admin onayı bekliyor');
  }

  // ── Admin ───────────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @ApiOperation({ summary: 'List all payouts (admin)' })
  async listAll(@Query() query: QueryPayoutsDto) {
    const data = await this.payouts.list(query);
    return ApiResponse.ok(data, 'Payouts retrieved');
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a payout for a vendor (auto-computes gross/fee/net from DELIVERED order items in the period if amounts omitted)',
  })
  async create(@Body() dto: CreatePayoutDto, @CurrentUser('id') actorId: string) {
    const data = await this.payouts.create(dto, actorId);
    return ApiResponse.ok(data, 'Payout created');
  }

  @Patch(':id/status')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @ApiOperation({ summary: 'Move a payout through PENDING → PROCESSING → PAID / FAILED' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePayoutStatusDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.payouts.updateStatus(id, dto, actorId);
    return ApiResponse.ok(data, 'Payout status updated');
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @ApiOperation({ summary: 'Delete a payout (refused if already PAID)' })
  async remove(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    const data = await this.payouts.delete(id, actorId);
    return ApiResponse.ok(data, 'Payout deleted');
  }
}
