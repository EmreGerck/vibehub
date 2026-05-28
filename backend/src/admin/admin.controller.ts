import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiResponse } from '../common/response.dto';
import { PatchVendorStatusDto, PatchCommissionDto } from './dto/patch-vendor.dto';
import { PatchVendorFeaturesDto, PatchForumSettingsDto } from './dto/vendor-features.dto';
import { PatchPreOrderStatusDto } from './dto/admin-product.dto';
import { CreateAdminUserDto } from './dto/create-admin.dto';
import { QueryAuditDto } from './dto/query-audit.dto';
import { QueryVendorsDto } from '../vendor/dto/query-vendors.dto';
import { QueryOrdersDto } from '../order/dto/query-orders.dto';
import { QueryProductsDto } from '../product/dto/query-products.dto';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';
import { AdminCreateProductDto, AdminUpdateProductDto, AdminProductDiscountDto, AdminProductPreOrderDto } from './dto/admin-product.dto';
import { SetPermissionsDto, GrantPermissionDto } from './dto/permissions.dto';
import {
  AdminCreateVariantDto,
  AdminUpdateVariantDto,
  AdminUpdateUserDto,
  AdminResetPasswordDto,
  AdminUpdateTenantDto,
  AdminCancelOrderDto,
  AdminQueryReviewsDto,
  AdminUpdateReviewDto,
  AdminCreateVendorDto,
} from './dto/admin-extras.dto';
import { VendorPermission } from '@prisma/client';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateEventDto, UpdateEventDto, QueryEventsDto } from './dto/event.dto';
import { MediaService } from '../media/media.service';
import { CreateMediaDto, UpdateMediaDto } from '../media/dto/media.dto';
import { ForumService } from '../forum/forum.service';
import { UpdateForumSettingsDto } from '../forum/dto/forum.dto';
import { IsBoolean, IsEmail, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SecurityDigestService } from '../scheduler/security-digest.service';
import { SearchService } from '../search/search.service';
import { QueueService } from '../queue/queue.service';
import { BusinessMetricsService } from './business-metrics.service';

class UpdatePlatformSettingsDto {
  // Platform Identity
  @IsOptional() @IsString() @MaxLength(100) platformName?: string;
  @IsOptional() @IsString() @MaxLength(200) platformTagline?: string;
  @IsOptional() @IsEmail() supportEmail?: string;
  @IsOptional() @IsString() supportPhone?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsBoolean() darkModeDefault?: boolean;

  // Commerce
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) @Max(100) defaultCommissionRate?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) @Max(100) taxRate?: number;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) minProductPrice?: number;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) maxProductPrice?: number;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) freeShippingThreshold?: number;
  @IsOptional() @IsBoolean() allowGuestCheckout?: boolean;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) minPayoutAmount?: number;
  @IsOptional() @IsString() payoutSchedule?: string;

  // Vendor Controls
  @IsOptional() @IsBoolean() vendorSignupsOpen?: boolean;
  @IsOptional() @IsBoolean() autoApproveVendors?: boolean;
  @IsOptional() @IsInt() @Type(() => Number) @Min(1) maxProductsPerVendor?: number;
  @IsOptional() @IsBoolean() productSubmissionsOpen?: boolean;
  @IsOptional() @IsBoolean() autoApproveProducts?: boolean;

  // Content & Reviews
  @IsOptional() @IsBoolean() globalForumEnabled?: boolean;
  @IsOptional() @IsBoolean() requirePurchaseReview?: boolean;
  @IsOptional() @IsBoolean() autoApproveReviews?: boolean;
  @IsOptional() @IsInt() @Type(() => Number) @Min(1) maxImagesPerProduct?: number;
  @IsOptional() @IsInt() @Type(() => Number) @Min(100) maxReviewLength?: number;
  @IsOptional() @IsBoolean() allowVideoUploads?: boolean;

  // Security
  @IsOptional() @IsInt() @Type(() => Number) @Min(1) @Max(20) maxLoginAttempts?: number;
  @IsOptional() @IsInt() @Type(() => Number) @Min(1) sessionDurationHours?: number;
  @IsOptional() @IsBoolean() requireEmailVerification?: boolean;
  @IsOptional() @IsBoolean() maintenanceMode?: boolean;
  @IsOptional() @IsString() @MaxLength(500) maintenanceMessage?: string;

  // Notifications
  @IsOptional() @IsEmail() orderNotificationEmail?: string;
  @IsOptional() @IsInt() @Type(() => Number) @Min(0) lowStockThreshold?: number;
  @IsOptional() @IsBoolean() notifyVendorOnSale?: boolean;
  @IsOptional() @IsBoolean() notifyAdminOnVendorApply?: boolean;

  // SEO & Marketing
  @IsOptional() @IsString() @MaxLength(200) metaTitle?: string;
  @IsOptional() @IsString() @MaxLength(500) metaDescription?: string;
  @IsOptional() @IsString() ogImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(100) twitterHandle?: string;
  @IsOptional() @IsString() facebookPixelId?: string;
  @IsOptional() @IsString() googleTagManagerId?: string;
  @IsOptional() @IsString() robotsTxt?: string;
  @IsOptional() @IsString() schemaOrgJson?: string;
}

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly permissions: PermissionsService,
    private readonly mediaService: MediaService,
    private readonly forumService: ForumService,
    private readonly securityDigest: SecurityDigestService,
    private readonly searchService: SearchService,
    private readonly queueService: QueueService,
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

  // ── Platform overview ─────────────────────────────────────────────────────────

  @Get('overview')
  @ApiOperation({ summary: 'Platform overview stats for admin dashboard' })
  async getOverview() {
    return ApiResponse.ok(await this.adminService.getPlatformOverview());
  }

  // ── Vendors ───────────────────────────────────────────────────────────────────

  @Get('vendors')
  @ApiOperation({ summary: 'List all vendors (any status)' })
  async getVendors(@Query() query: QueryVendorsDto) {
    const data = await this.adminService.getVendors(query);
    return ApiResponse.ok(data, 'Vendors retrieved');
  }

  @Post('vendors')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a vendor directly (admin-only; bypasses public apply flow). Optionally creates a VENDOR_OWNER user.' })
  async adminCreateVendor(
    @Body() dto: AdminCreateVendorDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminCreateVendor(dto, actorId);
    return ApiResponse.ok(data, 'Vendor created');
  }

  @Patch('vendors/:id/status')
  @ApiOperation({ summary: 'Approve, reject, or suspend a vendor' })
  async patchVendorStatus(
    @Param('id') id: string,
    @Body() dto: PatchVendorStatusDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.patchVendorStatus(id, dto, actorId);
    return ApiResponse.ok(data, 'Vendor status updated');
  }

  @Patch('vendors/:id/commission')
  @ApiOperation({ summary: 'Override commission rate for a vendor' })
  async patchCommission(
    @Param('id') id: string,
    @Body() dto: PatchCommissionDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.patchCommission(id, dto, actorId);
    return ApiResponse.ok(data, 'Commission rate updated');
  }

  @Delete('vendors/:id')
  @ApiOperation({
    summary:
      'PERMANENTLY delete a vendor and all related products, banners, NFC tags, forum content, etc. ' +
      'Members are released (become customers). Pass ?force=true to also wipe order items and payouts.',
  })
  async deleteVendor(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.deleteVendor(id, actorId, force === 'true');
    return ApiResponse.ok(data, 'Vendor deleted');
  }

  @Patch('vendors/:id/features')
  @ApiOperation({
    summary:
      'Toggle per-vendor feature flags (forum / media / events / nfc). ' +
      'Disabled features are hidden from the storefront ribbon and their APIs return 404.',
  })
  async patchVendorFeatures(
    @Param('id') id: string,
    @Body() dto: PatchVendorFeaturesDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.patchVendorFeatures(id, dto, actorId);
    return ApiResponse.ok(data, 'Vendor features updated');
  }

  @Get('vendors/:id/forum-settings')
  @ApiOperation({ summary: 'Get the comprehensive forum settings for a vendor (auto-initialised if missing).' })
  async getVendorForumSettings(@Param('id') id: string) {
    const data = await this.adminService.getForumSettings(id);
    return ApiResponse.ok(data, 'Forum settings retrieved');
  }

  @Patch('vendors/:id/forum-settings')
  @ApiOperation({
    summary:
      'Update vendor forum sub-settings: moderation mode, content rules, slow mode, ' +
      'visibility, posting policy, auto-mod (banned keywords / auto-archive), community rules, etc.',
  })
  async patchVendorForumSettings(
    @Param('id') id: string,
    @Body() dto: PatchForumSettingsDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.patchForumSettings(id, dto, actorId);
    return ApiResponse.ok(data, 'Forum settings updated');
  }

  // ── Pre-orders ─────────────────────────────────────────────────────────────

  @Get('pre-orders')
  @ApiOperation({
    summary:
      'List pre-order line items across all orders. Filter by status (AWAITING_APPROVAL, APPROVED, PRODUCTION, SHIPPED, CANCELLED) and/or tenant.',
  })
  async listPreOrders(
    @Query('status') status: any,
    @Query('tenantId') tenantId: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
  ) {
    const data = await this.adminService.listPreOrders({
      status,
      tenantId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return ApiResponse.ok(data, 'Pre-orders retrieved');
  }

  @Patch('pre-orders/:itemId/status')
  @ApiOperation({
    summary:
      'Change the status of a pre-order line item (AWAITING_APPROVAL → APPROVED → PRODUCTION → SHIPPED, or CANCELLED). ' +
      'On APPROVED, an email is dispatched to the customer.',
  })
  async patchPreOrderStatus(
    @Param('itemId') itemId: string,
    @Body() dto: PatchPreOrderStatusDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.patchPreOrderStatus(itemId, dto, actorId);
    return ApiResponse.ok(data, 'Pre-order status updated');
  }

  // ── Orders ────────────────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'List all orders across all vendors' })
  async getAllOrders(@Query() query: QueryOrdersDto) {
    const data = await this.adminService.getAllOrders(query);
    return ApiResponse.ok(data, 'Orders retrieved');
  }

  // ── Products ──────────────────────────────────────────────────────────────────

  @Get('products/pending')
  @ApiOperation({ summary: 'List products pending review' })
  async getPendingProducts(@Query() query: QueryProductsDto) {
    const data = await this.adminService.getPendingProducts(query);
    return ApiResponse.ok(data, 'Pending products retrieved');
  }

  @Get('products')
  @ApiOperation({ summary: 'List all products across all vendors' })
  async getAllProducts(@Query() query: QueryProductsDto) {
    const data = await this.adminService.getAllProducts(query);
    return ApiResponse.ok(data, 'All products retrieved');
  }

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a product for any vendor (GOD/ADMIN only)' })
  async adminCreateProduct(
    @Body() dto: AdminCreateProductDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminCreateProduct(dto, actorId);
    return ApiResponse.ok(data, 'Product created');
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update any product' })
  async adminUpdateProduct(
    @Param('id') id: string,
    @Body() dto: AdminUpdateProductDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminUpdateProduct(id, dto, actorId);
    return ApiResponse.ok(data, 'Product updated');
  }

  @Patch('products/:id/discount')
  @ApiOperation({ summary: 'Set or clear a Compare At (sale) price on a product' })
  async adminSetProductDiscount(
    @Param('id') id: string,
    @Body() dto: AdminProductDiscountDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminSetProductDiscount(id, dto, actorId);
    return ApiResponse.ok(data, 'Product discount updated');
  }

  @Patch('products/:id/preorder')
  @ApiOperation({ summary: 'Configure pre-order settings on a product' })
  async adminSetProductPreOrder(
    @Param('id') id: string,
    @Body() dto: AdminProductPreOrderDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminSetProductPreOrder(id, dto, actorId);
    return ApiResponse.ok(data, 'Product pre-order configuration updated');
  }

  @Patch('products/:id/publish')
  @ApiOperation({ summary: 'Publish product directly to LIVE' })
  async adminPublishProduct(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminPublishProduct(id, actorId);
    return ApiResponse.ok(data, 'Product published');
  }

  @Patch('products/:id/unpublish')
  @ApiOperation({ summary: 'Archive (unpublish) a product' })
  async adminUnpublishProduct(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminUnpublishProduct(id, actorId);
    return ApiResponse.ok(data, 'Product unpublished');
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete any product' })
  async adminDeleteProduct(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminDeleteProduct(id, actorId);
    return ApiResponse.ok(data, 'Product deleted');
  }

  // ── Financials ────────────────────────────────────────────────────────────────

  @Get('financials')
  @ApiOperation({ summary: 'Platform financial summary: GMV, fees, payouts' })
  async getFinancialSummary() {
    const data = await this.adminService.getFinancialSummary();
    return ApiResponse.ok(data, 'Financial summary retrieved');
  }

  // ── Users ─────────────────────────────────────────────────────────────────────

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.GOD_USER)
  @ApiOperation({ summary: 'Create a new PLATFORM_ADMIN user (GOD_USER only)' })
  async createAdminUser(
    @Body() dto: CreateAdminUserDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.createAdminUser(dto, actorId);
    return ApiResponse.ok(data, 'Admin user created');
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users, optionally filtered by role' })
  async getUsers(@Query('role') role?: UserRole) {
    const data = await this.adminService.getUsers(role);
    return ApiResponse.ok(data, 'Users retrieved');
  }

  // ── Hero Banners ──────────────────────────────────────────────────────────────

  @Get('banners')
  @ApiOperation({ summary: 'List all hero banners' })
  async getBanners() {
    const data = await this.adminService.getBanners();
    return ApiResponse.ok(data, 'Banners retrieved');
  }

  @Post('banners')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new hero banner' })
  async createBanner(@Body() dto: CreateBannerDto, @CurrentUser('id') actorId: string) {
    const data = await this.adminService.createBanner(dto, actorId);
    return ApiResponse.ok(data, 'Banner created');
  }

  @Patch('banners/:id')
  @ApiOperation({ summary: 'Update a hero banner' })
  async updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto, @CurrentUser('id') actorId: string) {
    const data = await this.adminService.updateBanner(id, dto, actorId);
    return ApiResponse.ok(data, 'Banner updated');
  }

  @Delete('banners/:id')
  @ApiOperation({ summary: 'Delete a hero banner' })
  async deleteBanner(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    const data = await this.adminService.deleteBanner(id, actorId);
    return ApiResponse.ok(data, 'Banner deleted');
  }

  @Patch('banners/:id/toggle')
  @ApiOperation({ summary: 'Toggle banner active state' })
  async toggleBanner(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    const data = await this.adminService.toggleBanner(id, actorId);
    return ApiResponse.ok(data, 'Banner toggled');
  }

  // ── Admin: variant CRUD ───────────────────────────────────────────────────────

  @Post('products/:id/variants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a variant for any product (admin)' })
  async adminCreateVariant(
    @Param('id') productId: string,
    @Body() dto: AdminCreateVariantDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminCreateVariant(productId, dto, actorId);
    return ApiResponse.ok(data, 'Variant created');
  }

  @Patch('variants/:variantId')
  @ApiOperation({ summary: 'Update any variant (admin)' })
  async adminUpdateVariant(
    @Param('variantId') variantId: string,
    @Body() dto: AdminUpdateVariantDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminUpdateVariant(variantId, dto, actorId);
    return ApiResponse.ok(data, 'Variant updated');
  }

  @Delete('variants/:variantId')
  @ApiOperation({ summary: 'Delete any variant (admin)' })
  async adminDeleteVariant(
    @Param('variantId') variantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminDeleteVariant(variantId, actorId);
    return ApiResponse.ok(data, 'Variant deleted');
  }

  // ── Admin: user management ────────────────────────────────────────────────────

  @Patch('users/:id')
  @ApiOperation({ summary: 'Edit a user (email/name/role/tenantId)' })
  async adminUpdateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminUpdateUser(id, dto, actorId);
    return ApiResponse.ok(data, 'User updated');
  }

  @Post('users/:id/password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force-reset a user password (also invalidates refresh tokens)' })
  async adminResetUserPassword(
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminResetUserPassword(id, dto, actorId);
    return ApiResponse.ok(data, 'Password reset');
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user (refused if they have order/review history)' })
  async adminDeleteUser(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    const data = await this.adminService.adminDeleteUser(id, actorId);
    return ApiResponse.ok(data, 'User deleted');
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Customer 360 view: profile + orders + addresses + activity in one call' })
  async adminGetUserDetail(@Param('id') id: string) {
    const data = await this.adminService.adminGetUserDetail(id);
    return ApiResponse.ok(data, 'User detail retrieved');
  }

  @Post('users/:id/unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear failed-login counter and lockedUntil for a user (does not change password)' })
  async adminUnlockUser(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    const data = await this.adminService.adminUnlockUser(id, actorId);
    return ApiResponse.ok(data, 'User account unlocked');
  }

  // ── Order CSV export ──────────────────────────────────────────────────────────

  @Get('orders/export.csv')
  @ApiOperation({ summary: 'Export orders to CSV (filtered by status, vendor, date range, search)' })
  async exportOrdersCsv(
    @Res({ passthrough: false }) res: any,
    @Query('status')   status?: string,
    @Query('tenantId') tenantId?: string,
    @Query('from')     from?: string,
    @Query('to')       to?: string,
    @Query('q')        q?: string,
  ) {
    const { csv, filename } = await this.adminService.exportOrdersCsv({ status, tenantId, from, to, q });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ── Admin: tenant deep-edit ───────────────────────────────────────────────────

  @Patch('vendors/:id')
  @ApiOperation({ summary: 'Edit any vendor field (slug, name, status, commission, bio, images)' })
  async adminUpdateTenant(
    @Param('id') id: string,
    @Body() dto: AdminUpdateTenantDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminUpdateTenant(id, dto, actorId);
    return ApiResponse.ok(data, 'Vendor updated');
  }

  // ── Admin: order cancel / refund ──────────────────────────────────────────────

  @Patch('orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel any order, optionally restocking inventory' })
  async adminCancelOrder(
    @Param('id') id: string,
    @Body() dto: AdminCancelOrderDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminCancelOrder(id, dto, actorId);
    return ApiResponse.ok(data, 'Order cancelled');
  }

  // Legacy `PATCH orders/:id/refund` removed 2026-05-28 — refunds now flow through
  // the customer-requested workflow only (`PATCH /order/admin/:id/approve-refund`
  // in order.controller.ts) which notifies the customer + integrates with the
  // return shipment workflow. Force-refund without a request is intentionally
  // unavailable; admins cancel the order with restock instead.

  // ── Admin: review moderation ──────────────────────────────────────────────────

  @Get('reviews')
  @ApiOperation({ summary: 'List all reviews with optional filters' })
  async adminListReviews(@Query() query: AdminQueryReviewsDto) {
    const data = await this.adminService.adminListReviews(query);
    return ApiResponse.ok(data, 'Reviews retrieved');
  }

  @Patch('reviews/:id')
  @ApiOperation({ summary: 'Edit a review (rating/comment)' })
  async adminUpdateReview(
    @Param('id') id: string,
    @Body() dto: AdminUpdateReviewDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.adminService.adminUpdateReview(id, dto, actorId);
    return ApiResponse.ok(data, 'Review updated');
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete a review' })
  async adminDeleteReview(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    const data = await this.adminService.adminDeleteReview(id, actorId);
    return ApiResponse.ok(data, 'Review deleted');
  }

  // ── Vendor permissions ────────────────────────────────────────────────────────

  @Get('permissions/catalog')
  @ApiOperation({ summary: 'List every available vendor permission with descriptions' })
  async permissionCatalog() {
    return ApiResponse.ok(this.permissions.catalog(), 'Permission catalog');
  }

  @Get('vendors/:id/permissions')
  @ApiOperation({ summary: 'List permissions granted to a vendor' })
  async getVendorPermissions(@Param('id') id: string) {
    const data = await this.permissions.getTenantPermissions(id);
    return ApiResponse.ok({ permissions: data }, 'Vendor permissions');
  }

  @Post('vendors/:id/permissions/:permission')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant a single permission to a vendor' })
  async grantPermission(
    @Param('id') id: string,
    @Param('permission') permission: VendorPermission,
    @Body() dto: GrantPermissionDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.permissions.grant(id, permission, actorId, dto.note);
    return ApiResponse.ok({ permissions: data }, 'Permission granted');
  }

  @Delete('vendors/:id/permissions/:permission')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a single permission from a vendor (existing content is frozen, not deleted)' })
  async revokePermission(
    @Param('id') id: string,
    @Param('permission') permission: VendorPermission,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.permissions.revoke(id, permission, actorId);
    return ApiResponse.ok({ permissions: data }, 'Permission revoked');
  }

  @Patch('vendors/:id/permissions')
  @ApiOperation({ summary: 'Replace the full permission set for a vendor' })
  async setPermissions(
    @Param('id') id: string,
    @Body() dto: SetPermissionsDto,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.permissions.setAll(id, dto.permissions, actorId);
    return ApiResponse.ok({ permissions: data }, 'Permissions updated');
  }

  @Post('vendors/:id/permissions/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a vendor to the platform-default permission set' })
  async resetPermissions(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    const data = await this.permissions.resetToDefaults(id, actorId);
    return ApiResponse.ok({ permissions: data }, 'Permissions reset to defaults');
  }

  // ── Audit log ─────────────────────────────────────────────────────────────────

  @Get('audit-log')
  @ApiOperation({ summary: 'Paginated audit log with optional filters' })
  async getAuditLog(@Query() query: QueryAuditDto) {
    const data = await this.adminService.getAuditLog(query);
    return ApiResponse.ok(data, 'Audit log retrieved');
  }

  // ── Events ────────────────────────────────────────────────────────────────────

  @Get('events')
  @ApiOperation({ summary: 'List all events (paginated, filterable)' })
  async listEvents(@Query() query: QueryEventsDto) {
    return ApiResponse.ok(await this.adminService.listEvents(query));
  }

  @Post('events')
  @ApiOperation({ summary: 'Create an event' })
  async createEvent(@Body() dto: CreateEventDto, @CurrentUser('id') actorId: string) {
    return ApiResponse.ok(await this.adminService.createEvent(dto, actorId), 'Event created');
  }

  @Patch('events/:id')
  @ApiOperation({ summary: 'Update an event' })
  async updateEvent(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.adminService.updateEvent(id, dto, actorId), 'Event updated');
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an event' })
  async deleteEvent(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return ApiResponse.ok(await this.adminService.deleteEvent(id, actorId), 'Event deleted');
  }

  // ── Admin Media ───────────────────────────────────────────────────────────────

  @Get('media/:tenantId')
  @ApiOperation({ summary: 'List all media for any vendor' })
  async adminListMedia(@Param('tenantId') tenantId: string) {
    return ApiResponse.ok(await this.mediaService.listForVendor(tenantId));
  }

  @Post('media/:tenantId')
  @ApiOperation({ summary: 'Add media embed for any vendor' })
  async adminCreateMedia(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateMediaDto,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.mediaService.create(tenantId, dto, actorId), 'Media added');
  }

  @Patch('media/:id')
  @ApiOperation({ summary: 'Update any media embed' })
  async adminUpdateMedia(
    @Param('id') id: string,
    @Body() dto: UpdateMediaDto,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.mediaService.update(id, dto, actorId), 'Media updated');
  }

  @Delete('media/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete any media embed' })
  async adminDeleteMedia(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return ApiResponse.ok(await this.mediaService.delete(id, actorId), 'Media deleted');
  }

  // ── Admin Forum ───────────────────────────────────────────────────────────────

  @Get('forum/settings/:tenantId')
  @ApiOperation({ summary: 'Get forum settings for any vendor' })
  async adminGetForumSettings(@Param('tenantId') tenantId: string) {
    return ApiResponse.ok(await this.forumService.getSettings(tenantId));
  }

  @Patch('forum/settings/:tenantId')
  @ApiOperation({ summary: 'Override forum settings for any vendor' })
  async adminUpdateForumSettings(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateForumSettingsDto,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.forumService.updateSettings(tenantId, dto, actorId), 'Forum settings updated');
  }

  // ── Analytics ─────────────────────────────────────────────────────────────────

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Get('analytics/overview')
  @ApiOperation({ summary: 'Analytics overview from DB' })
  async analyticsOverview() {
    return ApiResponse.ok(await this.adminService.getAnalyticsOverview(), 'Analytics overview');
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Get('analytics/revenue-trend')
  @ApiOperation({ summary: 'Daily revenue for last N days' })
  async analyticsRevenueTrend(@Query('days') days?: string) {
    return ApiResponse.ok(await this.adminService.getRevenueTrend(days ? +days : 30), 'Revenue trend');
  }

  @Get('analytics/user-growth')
  @ApiOperation({ summary: 'Weekly new user registrations' })
  async analyticsUserGrowth(@Query('weeks') weeks?: string) {
    return ApiResponse.ok(await this.adminService.getUserGrowth(weeks ? +weeks : 12), 'User growth');
  }

  @Get('analytics/top-products')
  @ApiOperation({ summary: 'Top 10 products by units sold' })
  async analyticsTopProducts() {
    return ApiResponse.ok(await this.adminService.getTopProducts(), 'Top products');
  }

  @Get('analytics/customer-segments')
  @ApiOperation({ summary: 'Customer segmentation: browsers, regular, VIP' })
  async analyticsCustomerSegments() {
    return ApiResponse.ok(await this.adminService.getCustomerSegments(), 'Customer segments');
  }

  @Get('analytics/order-status')
  @ApiOperation({ summary: 'Order count by status' })
  async analyticsOrderStatus() {
    return ApiResponse.ok(await this.adminService.getOrderStatusBreakdown(), 'Order status');
  }

  @Get('analytics/role-breakdown')
  @ApiOperation({ summary: 'User count by role' })
  async analyticsRoleBreakdown() {
    return ApiResponse.ok(await this.adminService.getRoleBreakdown(), 'Role breakdown');
  }

  // ── Platform Settings ─────────────────────────────────────────────────────────

  // ── Security Monitoring ───────────────────────────────────────────────────────

  @Throttle({ default: { ttl: 30000, limit: 10 } })
  @Get('security/overview')
  @ApiOperation({ summary: 'Security overview — threat level, failed logins, brute-force detection, system health' })
  async securityOverview() {
    return ApiResponse.ok(await this.adminService.getSecurityOverview(), 'Security overview');
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('security/send-digest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger an ad-hoc security digest email immediately (GOD_USER only)' })
  @Roles(UserRole.GOD_USER)
  async triggerSecurityDigest() {
    const result = await this.securityDigest.sendNow();
    return ApiResponse.ok(result, `Digest sent to ${result.sent} recipient(s)`);
  }

  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Get('security/events')
  @ApiOperation({ summary: 'Paginated security event log' })
  async securityEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return ApiResponse.ok(
      await this.adminService.getSecurityEvents({
        page: page ? +page : 1,
        limit: limit ? +limit : 30,
        action,
        fromDate,
        toDate,
      }),
      'Security events',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Search index management
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('search/stats')
  @ApiOperation({ summary: 'Meilisearch index stats' })
  async searchStats() {
    return ApiResponse.ok(await this.searchService.getStats(), 'Search stats');
  }

  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @Post('search/reindex')
  @Roles(UserRole.GOD_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full reindex of all LIVE products into Meilisearch (GOD_USER only)' })
  async reindexSearch() {
    const result = await this.searchService.reindexAll();
    return ApiResponse.ok(result, `Reindex complete — ${result.indexed} products indexed`);
  }

  // ── Queue health (BullMQ) ─────────────────────────────────────────────────────

  @Get('queue-health')
  @ApiOperation({
    summary:
      'BullMQ mail-queue counters (waiting / active / failed / completed). ' +
      'Use this to detect mail delivery backlogs without opening a Redis shell.',
  })
  async queueHealth() {
    const health = await this.queueService.getMailQueueHealth();
    return ApiResponse.ok({ queue: 'mail', ...health }, 'Queue health');
  }

  // ── Business metrics (BI snapshot) ───────────────────────────────────────────

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Get('business-metrics')
  @ApiOperation({
    summary:
      'Last-30-day business snapshot — GMV, active vendors, vendor activation rate, ' +
      'refund rate, cart abandonment, avg time-to-first-order. Cached 60s.',
  })
  async getBusinessMetrics() {
    return ApiResponse.ok(await this.businessMetrics.getSnapshot(), 'Business metrics');
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get global platform settings' })
  async getPlatformSettings() {
    return ApiResponse.ok(await this.adminService.getPlatformSettings(), 'Settings retrieved');
  }

  @Patch('settings')
  @Roles(UserRole.GOD_USER)
  @ApiOperation({ summary: 'Update global platform settings (GOD_USER only)' })
  async updatePlatformSettings(
    @Body() dto: UpdatePlatformSettingsDto,
    @CurrentUser('id') actorId: string,
  ) {
    return ApiResponse.ok(await this.adminService.updatePlatformSettings(dto, actorId), 'Settings updated');
  }
}
