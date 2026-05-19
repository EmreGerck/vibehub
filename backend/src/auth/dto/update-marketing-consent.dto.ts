import { IsBoolean } from 'class-validator';

export class UpdateMarketingConsentDto {
  @IsBoolean()
  consent: boolean;
}
