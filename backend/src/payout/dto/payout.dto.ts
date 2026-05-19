import {
  IsString,
  IsDateString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PayoutStatus } from '@prisma/client';
import { PaginationDto } from '../../common/pagination.dto';

export class CreatePayoutDto {
  @IsString()
  tenantId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  grossAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  platformFee?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  netAmount?: number;
}

export class UpdatePayoutStatusDto {
  @ApiProperty({ enum: PayoutStatus })
  @IsEnum(PayoutStatus)
  status!: PayoutStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryPayoutsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @ApiProperty({ enum: PayoutStatus })
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;
}
