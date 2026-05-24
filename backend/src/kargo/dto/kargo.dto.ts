import { IsString, IsNumber, IsOptional, IsIn, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShipmentDto {
  @ApiProperty() @IsString() orderId: string;

  @ApiProperty() @IsString() @MaxLength(100) receiverName: string;
  @ApiProperty() @IsString() @MaxLength(20)  receiverPhone: string;
  @ApiProperty() @IsString() @MaxLength(300) receiverAddress: string;
  @ApiProperty() @IsString() @MaxLength(80)  receiverCity: string;
  @ApiProperty() @IsString() @MaxLength(80)  receiverDistrict: string;

  @ApiPropertyOptional() @IsOptional() @IsString() receiverZip?: string;

  @ApiProperty({ description: 'Gross weight in kg' })
  @IsNumber() @Min(0.1) weight: number;

  @ApiPropertyOptional({ description: 'Volumetric (desi) weight override' })
  @IsOptional() @IsNumber() @Min(0) desi?: number;

  @ApiProperty() @IsString() @MaxLength(100) description: string;

  @ApiPropertyOptional({ enum: ['aras', 'yurtici'] })
  @IsOptional() @IsIn(['aras', 'yurtici']) carrier?: 'aras' | 'yurtici';
}
