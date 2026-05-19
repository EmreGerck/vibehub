import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { VendorPermission } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class SetPermissionsDto {
  @ApiProperty({ enum: VendorPermission, isArray: true })
  @IsArray()
  @IsEnum(VendorPermission, { each: true })
  permissions!: VendorPermission[];
}

export class GrantPermissionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}
