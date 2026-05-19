import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsObject,
  IsEnum,
  IsBoolean,
  IsEmail,
  Matches,
  Min,
  IsPositive,
  MaxLength,
  MinLength,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArtistType, OrderStatus, TenantStatus, UserRole } from '@prisma/client';
import { PaginationDto } from '../../common/pagination.dto';

// ── Admin create vendor ────────────────────────────────────────────────────────

export class AdminCreateVendorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug may only contain lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @ApiProperty({ enum: ArtistType })
  @IsEnum(ArtistType)
  artistType!: ArtistType;

  @IsOptional()
  @ApiProperty({ enum: TenantStatus, default: TenantStatus.ACTIVE })
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  commissionRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  // Optional owner-user creation. If omitted, the tenant is created without an
  // owner user (admin can attach one later via PATCH /admin/users/:id).
  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  ownerPassword?: string;
}

// ── Variants ────────────────────────────────────────────────────────────────────

export class AdminCreateVariantDto {
  @IsString()
  @MaxLength(80)
  sku!: string;

  @IsObject()
  attributes!: Record<string, string>;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  priceOverride?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stockQty!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  lowStockThreshold?: number;
}

export class AdminUpdateVariantDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  priceOverride?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stockQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  lowStockThreshold?: number;
}

// ── Users ──────────────────────────────────────────────────────────────────────

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  tenantId?: string | null;
}

export class AdminResetPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  password!: string;
}

// ── Tenant deep edit ───────────────────────────────────────────────────────────

export class AdminUpdateTenantDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @ApiProperty({ enum: ArtistType })
  @IsEnum(ArtistType)
  artistType?: ArtistType;

  @IsOptional()
  @ApiProperty({ enum: TenantStatus })
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Type(() => Number)
  commissionRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;
}

// ── Orders ─────────────────────────────────────────────────────────────────────

export class AdminCancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;

  @IsOptional()
  @IsBoolean()
  restock?: boolean;
}

export class AdminRefundOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsBoolean()
  restock?: boolean;
}

// ── Reviews ────────────────────────────────────────────────────────────────────

export class AdminQueryReviewsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRating?: number;
}

export class AdminUpdateReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
