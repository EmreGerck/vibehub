import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { ArtistType, FulfilmentType } from '@prisma/client';

export class ApplyVendorDto {
  // Tenant fields
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug may only contain lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsEnum(ArtistType)
  artistType: ArtistType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  // Owner account fields
  @IsEmail()
  ownerEmail: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  ownerPassword: string;

  // How the vendor intends to operate. VENDOR_MANAGED = vendor manufactures & ships
  // (legacy default — flat commission). VIBEHUB_MANAGED = VibeHub manufactures & ships,
  // profit-share negotiated per-product by admin. Admin can override later.
  @IsOptional()
  @IsEnum(FulfilmentType)
  defaultFulfilment?: FulfilmentType;

  /** Honeypot — see RegisterDto for rationale. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
