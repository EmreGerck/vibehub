import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
  IsObject,
  IsBoolean,
  IsInt,
  Min,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PreOrderStatus } from '@prisma/client';

export class AdminCreateProductDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  translations?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  previewVideoUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  // ── Pre-order ────────────────────────────────────────────────────────────
  @IsOptional() @IsBoolean() isPreOrder?: boolean;
  @IsOptional() @IsDateString() preOrderShipDate?: string;
  @IsOptional() @IsDateString() preOrderEndsAt?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) preOrderLimit?: number;
}

export class AdminUpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  translations?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  previewVideoUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsObject()
  imageSettings?: Record<string, { x: number; y: number }>;

  // ── Pre-order ────────────────────────────────────────────────────────────
  @IsOptional() @IsBoolean() isPreOrder?: boolean;
  @IsOptional() @IsDateString() preOrderShipDate?: string | null;
  @IsOptional() @IsDateString() preOrderEndsAt?: string | null;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) preOrderLimit?: number | null;
}

// ── Admin pre-order status patch ────────────────────────────────────────────

export class PatchPreOrderStatusDto {
  @IsEnum(PreOrderStatus)
  status: PreOrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
