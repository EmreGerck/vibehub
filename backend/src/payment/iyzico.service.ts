import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

// ─── Response types ───────────────────────────────────────────────────────────
// These interfaces match İyzico's actual API response shape.
// When you wire up the real SDK, the return types stay identical —
// only the implementation body of each method changes.

export interface InitiatePaymentResult {
  paymentPageUrl: string;   // redirect customer here (hosted) or embed token
  conversationId: string;   // your internal reference — store on the Order
  token: string;            // İyzico's session token — used to verify later
}

export interface VerifyPaymentResult {
  success: boolean;
  status: 'success' | 'pending' | 'failure';
  paymentId: string;        // İyzico payment ID — store as Order.paymentRef
  conversationId: string;
  paidPrice: number;
  currency: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  errorMessage?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class IyzicoService {
  private readonly logger = new Logger(IyzicoService.name);

  // These will be injected via .env once you have real credentials
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly callbackUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey      = config.get('IYZICO_API_KEY', '');
    this.secretKey   = config.get('IYZICO_SECRET_KEY', '');
    this.baseUrl     = config.get('IYZICO_BASE_URL', 'https://sandbox-api.iyzipay.com');
    this.callbackUrl = config.get('IYZICO_CALLBACK_URL', 'http://localhost:3001/payments/iyzico/callback');
  }

  /**
   * Step 1 of checkout — create an İyzico payment session.
   * Real impl: POST /payment/iyzipos/checkoutform/initialize
   * with buyer info, basket items, price, callbackUrl.
   * Returns a checkoutFormContent (HTML snippet) or pageUrl for redirect flow.
   */
  async initiatePayment(
    orderId: string,
    amount: number,
    currency: string,
    buyer: { name: string; email: string; id: string },
  ): Promise<InitiatePaymentResult> {
    this.logger.log(`[IYZICO] Initiating payment | order=${orderId} amount=${amount} ${currency}`);

    // TODO: replace with real iyzipay SDK call
    // const iyzipay = new Iyzipay({ apiKey, secretKey, uri: baseUrl });
    // const request = { locale, conversationId, price, paidPrice, buyer, basketItems, callbackUrl, ... };
    // const result  = await iyzipay.checkoutFormInitialize.create(request);

    const conversationId = `conv-${orderId}`;
    const token = `tok-${uuidv4()}`;

    return {
      paymentPageUrl: `${this.baseUrl}/checkout?token=${token}&order=${orderId}`,
      conversationId,
      token,
    };
  }

  /**
   * Step 2 — verify after İyzico redirects back or calls the webhook.
   * Real impl: POST /payment/iyzipos/checkoutform/auth/ecom/detail
   * with the token from the callback.
   */
  async verifyPayment(token: string): Promise<VerifyPaymentResult> {
    this.logger.log(`[IYZICO] Verifying payment | token=${token}`);

    // TODO: replace with real iyzipay SDK call
    // const result = await iyzipay.checkoutForm.retrieve({ locale, conversationId, token });
    // return result.paymentStatus === 'SUCCESS' ? { success: true, ... } : { success: false, ... }

    return {
      success:        true,
      status:         'success',
      paymentId:      `pay-${uuidv4()}`,
      conversationId: `conv-placeholder`,
      paidPrice:      0,
      currency: 'TRY',
    };
  }

  /**
   * Refund a completed payment.
   * Real impl: POST /payment/refund with paymentTransactionId + price.
   */
  async refundPayment(paymentId: string, amount: number): Promise<RefundResult> {
    this.logger.log(`[IYZICO] Refunding | paymentId=${paymentId} amount=${amount}`);

    // TODO: replace with real iyzipay SDK call
    // const result = await iyzipay.refund.create({ paymentTransactionId, price, currency, ... });

    return { success: true, refundId: `ref-${uuidv4()}` };
  }
}
