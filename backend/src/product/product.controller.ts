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
import { UserRole } from '@prisma/client';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ReviewProductDto } from './dto/review-product.dto';
import { Public } from '../common/public.decorator';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiResponse } from '../common/response.dto';
import { RequirePermissions } from '../permissions/permissions.decorator';
import { VendorPermission } from '@prisma/client';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ── Public browse ─────────────────────────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse LIVE products (public)' })
  async findAll(@Query() query: QueryProductsDto) {
    const lang = (query as any).lang ?? 'tr';
    const result = await this.productService.findAll(query, false, lang);
    return ApiResponse.ok(result, 'Products retrieved');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get single product detail (public, LIVE only)' })
  async findOne(@Param('id') id: string, @Query('lang') lang = 'tr') {
    const product = await this.productService.findOne(id, false, lang);
    return ApiResponse.ok(product, 'Product retrieved');
  }

  // ── Vendor: manage own products ────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.PRODUCT_CREATE)
  @ApiOperation({ summary: 'Create a new product (DRAFT)' })
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: any) {
    const product = await this.productService.create(user.tenantId, dto, user.id);
    return ApiResponse.ok(product, 'Product created');
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.PRODUCT_EDIT)
  @ApiOperation({ summary: 'Update a DRAFT product' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    const product = await this.productService.update(id, dto, user);
    return ApiResponse.ok(product, 'Product updated');
  }

  @Patch(':id/submit')
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.PRODUCT_SUBMIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit product for review (DRAFT → PENDING_REVIEW)' })
  async submit(@Param('id') id: string, @CurrentUser() user: any) {
    const product = await this.productService.submitForReview(id, user);
    return ApiResponse.ok(product, 'Submitted for review');
  }

  @Patch(':id/archive')
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.PRODUCT_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a product (pull it from storefront)' })
  async archive(@Param('id') id: string, @CurrentUser() user: any) {
    const product = await this.productService.archive(id, user);
    return ApiResponse.ok(product, 'Product archived');
  }

  // ── Variants ──────────────────────────────────────────────────────────────────

  @Post(':id/variants')
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.VARIANT_MANAGE)
  @ApiOperation({ summary: 'Add a variant to a product' })
  async createVariant(
    @Param('id') id: string,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: any,
  ) {
    const variant = await this.productService.createVariant(id, dto, user);
    return ApiResponse.ok(variant, 'Variant created');
  }

  @Patch('variants/:variantId')
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.VARIANT_MANAGE)
  @ApiOperation({ summary: 'Update a variant (price override, stock, threshold)' })
  async updateVariant(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
    @CurrentUser() user: any,
  ) {
    const variant = await this.productService.updateVariant(variantId, dto, user);
    return ApiResponse.ok(variant, 'Variant updated');
  }

  @Patch('variants/:variantId/stock')
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.INVENTORY_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust stock by delta (positive = add, negative = subtract)' })
  async adjustStock(
    @Param('variantId') variantId: string,
    @Body('delta') delta: number,
    @CurrentUser() user: any,
  ) {
    const variant = await this.productService.adjustStock(variantId, delta, user);
    return ApiResponse.ok(variant, 'Stock adjusted');
  }

  @Delete('variants/:variantId')
  @ApiBearerAuth()
  @Roles(UserRole.VENDOR_OWNER, UserRole.VENDOR_MANAGER)
  @RequirePermissions(VendorPermission.VARIANT_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a variant (only on DRAFT/ARCHIVED products)' })
  async deleteVariant(@Param('variantId') variantId: string, @CurrentUser() user: any) {
    await this.productService.deleteVariant(variantId, user);
    return ApiResponse.ok(null, 'Variant deleted');
  }

  // ── Admin: review queue ────────────────────────────────────────────────────────

  @Get('admin/pending')
  @ApiBearerAuth()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @ApiOperation({ summary: 'List all products pending review (admin)' })
  async pendingReview(@Query() query: QueryProductsDto) {
    const result = await this.productService.findPendingReview(query);
    return ApiResponse.ok(result, 'Pending review products');
  }

  @Patch(':id/review')
  @ApiBearerAuth()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOD_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a product (PENDING_REVIEW → LIVE | ARCHIVED)' })
  async reviewProduct(
    @Param('id') id: string,
    @Body() dto: ReviewProductDto,
    @CurrentUser() user: any,
  ) {
    const product = await this.productService.review(id, dto, user.id);
    return ApiResponse.ok(product, `Product ${dto.decision.toLowerCase()}d`);
  }
}
