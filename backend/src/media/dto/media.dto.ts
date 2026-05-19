import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMediaDto {
  @ApiProperty({ enum: MediaType }) @IsEnum(MediaType)
  type: MediaType;

  @ApiProperty() @IsString() @IsNotEmpty()
  url: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  sortOrder?: number;
}

export class UpdateMediaDto {
  @ApiPropertyOptional({ enum: MediaType }) @IsOptional() @IsEnum(MediaType)
  type?: MediaType;

  @ApiPropertyOptional() @IsOptional() @IsString()
  url?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  active?: boolean;
}
