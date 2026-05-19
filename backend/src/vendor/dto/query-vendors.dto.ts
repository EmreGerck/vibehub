import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ArtistType, TenantStatus } from '@prisma/client';
import { PaginationDto } from '../../common/pagination.dto';

export class QueryVendorsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsEnum(ArtistType)
  artistType?: ArtistType;

  @IsOptional()
  @IsString()
  search?: string;
}
