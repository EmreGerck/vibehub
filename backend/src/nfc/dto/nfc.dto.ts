import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
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

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
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

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class BulkUpdateDestinationDto {
  @ApiProperty() @IsUUID()
  tenantId: string;

  @ApiProperty() @IsString() @IsNotEmpty()
  destinationUrl: string;
}

/** Bulk-generate N tags in one call. Supports event hand-outs, concert wristbands, etc. */
export class BulkGenerateNfcTagsDto {
  @ApiProperty({ description: 'Number of tags to generate (max 1000 per call)', minimum: 1, maximum: 1000 })
  @IsInt() @Min(1) @Max(1000)
  @Type(() => Number)
  count: number;

  @ApiProperty({ description: 'Name prefix — final name is "{namePrefix} #{N}"' })
  @IsString() @IsNotEmpty() @MaxLength(60)
  namePrefix: string;

  @ApiProperty({ description: 'Where each tag redirects to (same for all in batch)' })
  @IsUrl() @IsNotEmpty()
  destinationUrl: string;

  @ApiPropertyOptional({ description: 'Optional batch label so admin can filter all of these later' })
  @IsOptional() @IsString() @MaxLength(60)
  batchId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class AssignNfcTagDto {
  @ApiProperty({ description: 'User ID to assign this tag to (or empty string to unassign)' })
  @IsOptional() @IsString()
  assignedToUserId: string | null;
}

export class QueryNfcTagsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  @Type(() => Boolean)
  enabled?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString()
  batchId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  tenantId?: string;
}
