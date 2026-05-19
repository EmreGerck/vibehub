import { IsEnum, IsOptional, IsNumber, IsPositive, Max, IsString, MaxLength } from 'class-validator';
import { TenantStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class PatchVendorStatusDto {
  @IsEnum(TenantStatus)
  status: TenantStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class PatchCommissionDto {
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  @Max(1)
  @Type(() => Number)
  commissionRate: number;
}
