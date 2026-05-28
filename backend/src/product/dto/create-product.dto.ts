import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  IsObject,
  MaxLength,
  MinLength,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[] = [];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] = [];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  previewVideoUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Shipping time note, e.g. "Ships in 3-5 days via DHL"' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  shippingNote?: string;

  @ApiPropertyOptional({ description: 'Spec attributes keyed by category schema' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Size chart override; falls back to category template' })
  @IsOptional()
  @IsObject()
  sizeChart?: Record<string, unknown>;
}
