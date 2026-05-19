import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ProductDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewProductDto {
  @IsEnum(ProductDecision)
  decision: ProductDecision;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
