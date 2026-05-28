import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  // Stage 3 — schema drives the vendor form + customer specs panel.
  // Pass `null` to clear; passing undefined leaves it untouched.
  @IsOptional()
  @IsObject()
  attributeSchema?: Record<string, unknown> | null;

  // Default size chart shape for this category. Product.sizeChart can override.
  @IsOptional()
  @IsObject()
  sizeChartTemplate?: Record<string, unknown> | null;
}
