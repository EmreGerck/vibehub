import { IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @IsString()
  variantId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  qty: number;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  qty: number;
}
