import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventProvider } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';

export class CreateEventDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  tenantId: string;

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiProperty() @IsString() @IsNotEmpty()
  href: string;

  @ApiProperty({ enum: EventProvider }) @IsEnum(EventProvider)
  provider: EventProvider;

  @ApiProperty() @IsDateString()
  date: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  venue?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean()
  active?: boolean;
}

export class UpdateEventDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  href?: string;

  @ApiPropertyOptional({ enum: EventProvider }) @IsOptional() @IsEnum(EventProvider)
  provider?: EventProvider;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  date?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  venue?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  imageUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  active?: boolean;
}

export class QueryEventsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: EventProvider }) @IsOptional() @IsEnum(EventProvider)
  provider?: EventProvider;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  toDate?: string;
}
