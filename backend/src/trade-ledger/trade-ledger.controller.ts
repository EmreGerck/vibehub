import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TradeLedgerService } from './trade-ledger.service';
import { TradeLedgerQueryDto } from './dto/trade-ledger.dto';
import { Roles } from '../common/roles.decorator';
import { ApiResponse } from '../common/response.dto';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Trade Ledger')
@ApiBearerAuth()
@Controller('admin/trade-ledger')
export class TradeLedgerController {
  constructor(private readonly ledger: TradeLedgerService) {}

  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Get()
  @ApiOperation({ summary: 'List orders with rich filtering + money breakdown' })
  async list(@Query() query: TradeLedgerQueryDto) {
    const data = await this.ledger.list(query);
    return ApiResponse.ok(data, 'Trade ledger retrieved');
  }

  // GOD_USER only — CSV contains customer PII and full money breakdown.
  // Audit-logged in the service.
  @Roles(UserRole.GOD_USER)
  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="vibehub-trade-ledger.csv"')
  async exportCsv(
    @Query() query: TradeLedgerQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const csv = await this.ledger.exportCsv(query, user.id);
    res.send(csv);
  }

  @Roles(UserRole.GOD_USER, UserRole.PLATFORM_ADMIN)
  @Get(':orderId')
  @ApiOperation({ summary: 'Full drill-down for a single order' })
  async findOne(@Param('orderId') orderId: string) {
    const data = await this.ledger.findOne(orderId);
    return ApiResponse.ok(data, 'Order detail retrieved');
  }
}
