import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum VendorDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewVendorDto {
  @IsEnum(VendorDecision)
  decision: VendorDecision;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
