import {
  IsBoolean,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ForumModerationMode, ForumVisibility, ForumPostingPolicy } from '@prisma/client';

/**
 * Per-vendor feature toggles. God-user only.
 * All fields optional — only provided ones are updated.
 */
export class PatchVendorFeaturesDto {
  @IsOptional() @IsBoolean() forumEnabled?: boolean;
  @IsOptional() @IsBoolean() mediaEnabled?: boolean;
  @IsOptional() @IsBoolean() eventsEnabled?: boolean;
  @IsOptional() @IsBoolean() nfcEnabled?: boolean;
}

/**
 * Comprehensive forum sub-settings. God-user only.
 * Mirrors the ForumSettings model — every field optional for partial updates.
 */
export class PatchForumSettingsDto {
  // Legacy / basic
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() requireApproval?: boolean;
  @IsOptional() @IsBoolean() allowGuestView?: boolean;

  // Moderation
  @IsOptional() @IsEnum(ForumModerationMode) moderationMode?: ForumModerationMode;
  @IsOptional() @IsBoolean() allowAnonymous?: boolean;

  // Content rules
  @IsOptional() @IsInt() @Min(1) @Max(10000) @Type(() => Number) minPostLength?: number;
  @IsOptional() @IsInt() @Min(10) @Max(100000) @Type(() => Number) maxPostLength?: number;
  @IsOptional() @IsBoolean() allowImages?: boolean;
  @IsOptional() @IsBoolean() allowLinks?: boolean;
  @IsOptional() @IsBoolean() allowMentions?: boolean;
  @IsOptional() @IsBoolean() allowReactions?: boolean;
  @IsOptional() @IsBoolean() allowReplies?: boolean;

  // Rate limiting
  @IsOptional() @IsInt() @Min(0) @Max(3600) @Type(() => Number) slowModeSeconds?: number;

  // Access & posting policy
  @IsOptional() @IsEnum(ForumVisibility) visibility?: ForumVisibility;
  @IsOptional() @IsEnum(ForumPostingPolicy) postingPolicy?: ForumPostingPolicy;

  // Auto-moderation
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true })
  bannedKeywords?: string[];

  @IsOptional() @IsInt() @Min(0) @Max(3650) @Type(() => Number) autoArchiveDays?: number;

  // Community
  @IsOptional() @IsString() @MaxLength(1000) welcomeMessage?: string | null;
  @IsOptional() @IsString() @MaxLength(20000) rulesText?: string | null;
}
