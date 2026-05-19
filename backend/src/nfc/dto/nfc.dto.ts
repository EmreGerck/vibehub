import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/pagination.dto';

export class CreateNfcTagDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @ApiProperty() @IsUrl() @IsNotEmpty()
  destinationUrl: string;

  /** Optional: URL already programmed on the chip. Auto-generated from tag ID if omitted. */
  @ApiPropertyOptional() @IsOptional() @IsUrl()
  staticUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  tenantId?: string;
}

export class UpdateNfcTagDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsUrl()
  destinationUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsUrl()
  staticUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  tenantId?: string;
}

export class BulkUpdateDestinationDto {
  @ApiProperty() @IsUUID()
  tenantId: string;

  @ApiProperty() @IsString() @IsNotEmpty()
  destinationUrl: string;
}

export class QueryNfcTagsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  @Type(() => Boolean)
  enabled?: boolean;
}
