import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsBooleanString,
} from 'class-validator';
import { OrderStatus, FulfilmentType } from '@prisma/client';
import { PaginationDto } from '../../common/pagination.dto';

export class TradeLedgerQueryDto extends PaginationDto {
  // Date range — inclusive on both ends. Default is "all time" when omitted.
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // Filter by a single tenant — admin usually drills into one vendor at a time.
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  // Lane filter — "all", VIBEHUB_MANAGED only, or VENDOR_MANAGED only.
  // Backed by OrderItem.fulfilment because Order has no fulfilment column.
  // 'BOTH' / undefined → no filter.
  @IsOptional()
  @IsEnum(FulfilmentType)
  fulfilment?: FulfilmentType;

  // 'true' / 'false' as query strings (URLs aren't typed).
  @IsOptional()
  @IsBooleanString()
  hasReview?: string;

  // Free-text search: matches order ID prefix, customer email contains,
  // paymentRef exact, shipment trackingNumber exact. Clamped to 100 chars.
  @IsOptional()
  @IsString()
  search?: string;
}
