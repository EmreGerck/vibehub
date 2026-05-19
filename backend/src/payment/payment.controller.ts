import { Controller, Post, Body, Param, Get, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { IyzicoService } from './iyzico.service';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { ApiResponse } from '../common/response.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly iyzico: IyzicoService) {}

  @Post('iyzico/initiate/:orderId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate İyzico checkout session for an order' })
  async initiate(@Param('orderId') orderId: string, @CurrentUser() user: any) {
    const result = await this.iyzico.initiatePayment(
      orderId,
      0,       // amount will be pulled from order in real impl
      'TRY',
      { id: user.id, name: user.email, email: user.email },
    );
    return ApiResponse.ok(result, 'Payment session created');
  }

  @Public()
  @Post('iyzico/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'İyzico payment callback webhook (public — called by İyzico)' })
  async callback(@Req() req: Request) {
    // In real impl: extract token from req.body, call iyzico.verifyPayment(token),
    // update Order.status to CONFIRMED and set Order.paymentRef = result.paymentId
    const token = req.body?.token;
    const result = await this.iyzico.verifyPayment(token ?? 'placeholder');
    // TODO: find order by conversationId and update status
    return ApiResponse.ok(result, 'Callback received');
  }

  @Post('iyzico/verify/:token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually verify a payment by token' })
  async verify(@Param('token') token: string) {
    const result = await this.iyzico.verifyPayment(token);
    return ApiResponse.ok(result, 'Payment verified');
  }

  @Post('iyzico/refund/:paymentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a payment' })
  async refund(@Param('paymentId') paymentId: string, @Body('amount') amount: number) {
    const result = await this.iyzico.refundPayment(paymentId, amount);
    return ApiResponse.ok(result, 'Refund processed');
  }
}
