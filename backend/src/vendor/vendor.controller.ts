import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { VendorService } from './vendor.service';
import { ApplyVendorDto } from './dto/apply-vendor.dto';
import { ReviewVendorDto } from './dto/review-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { QueryVendorsDto } from './dto/query-vendors.dto';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { ApiResponse } from '../common/response.dto';
import { RequirePermissions } from '../permissions/permissions.decorator';
import { VendorPermission } from '@prisma/client';
import { PermissionsService } from '../permissions/permissions.service';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorController {
  constructor(
    private readonly vendorService: VendorService,
    private readonly permissions: PermissionsService,
  ) {}

  // ── Public ─────────────────────────────────────────────────────────────────

  @Public()
  @Throttle({ default: { ttl: 3600000, limit: 3 } })
  @Post('apply')
  @ApiOperation({ summary: 'Apply to become a vendor (creates Tenant + VENDOR_OWNER user, throttled 3/hr per IP)' })
  async apply(@Body() dto: ApplyVendorDto) {
    const tenant = await this.vendorService.apply(dto);
    return ApiResponse.ok(tenant, 'Application submitted — pending review');
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse active vendors (public)' })
  async findAll(@Query() query: QueryVendorsDto) {
    const result = await this.vendorService.findAll(query, false);
    return ApiResponse.ok(result, 'Vendors retrieved');
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get vendor storefront by slug (public)' })
  async findBySlug(@Param('slug') slug: string) {
    const tenant = await this.vendorService.findBySlug(slug);
    return ApiResponse.ok(tenant, 'Vendor retrieved');
  }

  // ── Vendor Owner / Manager ──────────────────────────────────────────────────

  @Get('me')
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @ApiOperation({ summary: "Get the caller's own store" })
  async getMyStore(@CurrentUser() user: AuthenticatedUser) {
    const tenant = await this.vendorService.getMyTenant(user.id);
    return ApiResponse.ok(tenant, 'Store retrieved');
  }

  @Patch('me')
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.STOREFRONT_EDIT)
  @ApiOperation({ summary: "Update caller's own store profile" })
  async updateMyStore(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateVendorDto) {
    const tenant = await this.vendorService.update(user.tenantId, dto, user.id);
    return ApiResponse.ok(tenant, 'Store updated');
  }

  @Get('me/permissions')
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @ApiOperation({ summary: "Get the permissions granted to the caller's store (used to gate vendor UI)" })
  async getMyPermissions(@CurrentUser() user: AuthenticatedUser) {
    if (!user.tenantId) {
      return ApiResponse.ok({ permissions: [] }, 'No store associated');
    }
    const perms = await this.permissions.getTenantPermissions(user.tenantId);
    return ApiResponse.ok({ permissions: perms }, 'Permissions retrieved');
  }

  // ── Admin: review pending applications ─────────────────────────────────────

  @Patch(':id/review')
  @ApiBearerAuth()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @ApiOperation({ summary: 'Approve or reject a vendor application (admin only)' })
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewVendorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tenant = await this.vendorService.review(id, dto, user.id);
    return ApiResponse.ok(tenant, `Vendor ${dto.decision.toLowerCase()}d`);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @ApiOperation({ summary: 'Get vendor by ID (admin)' })
  async findById(@Param('id') id: string) {
    const tenant = await this.vendorService.findById(id);
    return ApiResponse.ok(tenant, 'Vendor retrieved');
  }

  // ── Follow / Unfollow (any authenticated user) ──────────────────────────────

  @Post(':id/follow')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow a vendor store' })
  async follow(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.vendorService.follow(user.id, id);
    return ApiResponse.ok(null, 'Following');
  }

  @Delete(':id/follow')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a vendor store' })
  async unfollow(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.vendorService.unfollow(user.id, id);
    return ApiResponse.ok(null, 'Unfollowed');
  }

  @Get(':id/follow')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check follow status for a vendor' })
  async followStatus(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const status = await this.vendorService.getFollowStatus(user.id, id);
    return ApiResponse.ok(status, 'Follow status');
  }

  // ── Events (public read) ─────────────────────────────────────────────────────

  // IMPORTANT: me/events must be declared BEFORE :id/events so NestJS doesn't
  // match "me" as a vendor ID and bypass the vendor role guard.
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @Get('me/events')
  @ApiOperation({ summary: 'Vendor reads own events (read-only)' })
  async myEvents(@CurrentUser('tenantId') tenantId: string) {
    const events = await this.vendorService.getVendorEvents(tenantId);
    return ApiResponse.ok(events);
  }

  @Public()
  @Get(':id/events')
  @ApiOperation({ summary: 'List active events for a vendor' })
  async getVendorEvents(@Param('id') id: string) {
    const events = await this.vendorService.getVendorEvents(id);
    return ApiResponse.ok(events);
  }
}
