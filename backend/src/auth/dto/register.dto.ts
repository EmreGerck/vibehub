import { IsEmail, IsString, MinLength, MaxLength, Matches, IsBoolean, Equals, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72)
  // Must contain at least one uppercase letter, one lowercase, and one digit
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsBoolean()
  @Equals(true, { message: 'You must accept the Terms of Service' })
  termsAccepted: boolean;

  @IsBoolean()
  @Equals(true, { message: 'You must accept the Privacy Policy and KVKK disclosure' })
  privacyAccepted: boolean;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  /**
   * Honeypot — a hidden form field legitimate users never see or fill.
   * Bots that auto-fill every input will populate it; the service layer
   * rejects the request and audits HONEYPOT_HIT. Loose validation on
   * purpose so we don't reveal what we're checking.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
