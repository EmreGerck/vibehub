import {
  IsString,
  IsInt,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  IsObject,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @IsString()
  @MaxLength(80)
  sku: string;

  @IsObject()
  attributes: Record<string, string>;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  priceOverride?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stockQty: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  lowStockThreshold?: number = 5;
}
