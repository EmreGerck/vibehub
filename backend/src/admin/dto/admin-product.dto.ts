import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

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
}
