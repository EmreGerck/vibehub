import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
  IsInt,
} from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
import { ReactionEmoji } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateTopicDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(5000)
  body: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  channelId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUrl()
  imageUrl?: string;
}

export class CreateReplyDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(5000)
  body: string;

  @ApiPropertyOptional() @IsOptional() @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  parentReplyId?: string;
}

export class UpdateForumSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  requireApproval?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  allowGuestView?: boolean;
}

export class CreateChannelDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(60)
  name: string;

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(60)
  slug: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8)
  emoji?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isDefault?: boolean;
}

export class UpdateChannelDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60)
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8)
  emoji?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isDefault?: boolean;
}

export class ToggleReactionDto {
  @ApiProperty({ enum: ReactionEmoji }) @IsEnum(ReactionEmoji)
  emoji: ReactionEmoji;
}

export class QueryTopicsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  channelId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  channelSlug?: string;

  @ApiPropertyOptional({ enum: ['latest', 'popular', 'artist_replied'] })
  @IsOptional() @IsString()
  sort?: 'latest' | 'popular' | 'artist_replied';
}
