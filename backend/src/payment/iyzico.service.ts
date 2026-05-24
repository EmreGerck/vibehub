import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Iyzipay = require('iyzipay');

// ─── Response types ───────────────────────────────────────────────────────────

export interface InitiatePaymentResult {
  paymentPageUrl: string;   // redirect customer here
  checkoutFormContent: string; // embedded form HTML (for iframe flow)
  conversationId: string;   // your internal reference — store on the Order
  token: string;            // İyzico session token — used to verify later
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wrap iyzipay's callback-based API in a Promise.
 * On success resolves with the result object.
 * On İyzico-level failure (status !== 'success') rejects with an Error.
 */
function iyzipayCall<T = any>(
  resource: { create?: (req: any, cb: any) => void; retrieve?: (req: any, cb: any) => void },
  method: 'create' | 'retrieve',
  request: Record<string, unknown>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const fn = method === 'create' ? resource.create! : resource.retrieve!;
    fn.call(resource, request, (err: Error | null, result: any) => {
      if (err) return reject(err);
      if (result?.status && result.status !== 'success') {
        return reject(new Error(result.errorMessage ?? `İyzico error: ${result.status}`));
      }
      resolve(result as T);
    });
  });
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class IyzicoService {
  private readonly logger = new Logger(IyzicoService.name);

  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly callbackUrl: string;
  private readonly isSandbox: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey      = config.get('IYZICO_API_KEY', '');
    this.secretKey   = config.get('IYZICO_SECRET_KEY', '');
    this.baseUrl     = config.get('IYZICO_BASE_URL', 'https://sandbox-api.iyzipay.com');
    this.callbackUrl = config.get('IYZICO_CALLBACK_URL', 'http://localhost:3001/payments/iyzico/callback');
    this.isSandbox   = !this.baseUrl.includes('api.iyzipay.com') || this.baseUrl.includes('sandbox');
  }

  /** Build a fresh SDK instance per call (stateless, safe for concurrent requests). */
  private getSdk(): InstanceType<typeof Iyzipay> {
    if (!this.apiKey || !this.secretKey) {
      // Fall back to sandbox mode with placeholder keys for local dev
      this.logger.warn('[IYZICO] No API keys configured — running in MOCK mode');
      return null;
    }
    return new Iyzipay({ apiKey: this.apiKey, secretKey: this.secretKey, uri: this.baseUrl });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 1: Create checkout form session
  // ─────────────────────────────────────────────────────────────────────────────

  async initiatePayment(
    orderId: string,
    amount: number,
    currency: string,
    buyer: { name: string; email: string; id: string },
  ): Promise<InitiatePaymentResult> {
    this.logger.log(`[IYZICO] Initiating payment | order=${orderId} amount=${amount} ${currency}`);

    const sdk = this.getSdk();
    const conversationId = `conv-${orderId}`;

    // Mock mode (no credentials) — useful for local dev / CI
    if (!sdk) {
      const token = `tok-mock-${uuidv4()}`;
      return {
        paymentPageUrl: `${this.baseUrl}/checkout?token=${token}&order=${orderId}`,
        checkoutFormContent: `<script>window.location='${this.callbackUrl}?token=${token}';</script>`,
        conversationId,
        token,
      };
    }

    // Split buyer name into first/last parts
    const nameParts = buyer.name.split(' ');
    const firstName = nameParts[0] ?? buyer.name;
    const lastName  = nameParts.slice(1).join(' ') || firstName;

    const request = {
      locale:              Iyzipay.LOCALE.TR,
      conversationId,
      price:               amount.toFixed(2),
      paidPrice:           amount.toFixed(2),
      currency:            currency || 'TRY',
      basketId:            `basket-${orderId}`,
      paymentGroup:        Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl:         this.callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: {
        id:                  buyer.id,
        name:                firstName,
        surname:             lastName,
        gsmNumber:           '+905350000000', // placeholder — enrich from user profile later
        email:               buyer.email,
        identityNumber:      '74300864791',   // placeholder — required by İyzico; collect at checkout
        lastLoginDate:       new Date().toISOString().slice(0, 19).replace('T', ' '),
        registrationDate:    new Date().toISOString().slice(0, 19).replace('T', ' '),
        registrationAddress: 'VibeHub Platform',
        ip:                  '85.34.78.112', // placeholder — pass real IP from controller
        city:                'Istanbul',
        country:             'Turkey',
        zipCode:             '34000',
      },
      shippingAddress: {
        contactName: buyer.name,
        city:        'Istanbul',
        country:     'Turkey',
        address:     'VibeHub Platform',
        zipCode:     '34000',
      },
      billingAddress: {
        contactName: buyer.name,
        city:        'Istanbul',
        country:     'Turkey',
        address:     'VibeHub Platform',
        zipCode:     '34000',
      },
      basketItems: [
        {
          id:        orderId,
          name:      `Order #${orderId.slice(-8)}`,
          category1: 'VibeHub',
          itemType:  Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
          price:     amount.toFixed(2),
        },
      ],
    };

    try {
      const result = await iyzipayCall(sdk.checkoutFormInitialize, 'create', request);
      const token = (result as any).token ?? '';

      this.logger.log(`[IYZICO] Checkout form created | convId=${conversationId} token=${token}`);

      return {
        paymentPageUrl:       (result as any).paymentPageUrl ?? '',
        checkoutFormContent:  (result as any).checkoutFormContent ?? '',
        conversationId,
        token,
      };
    } catch (err) {
      this.logger.error(`[IYZICO] initiatePayment failed | order=${orderId} err=${err.message}`);
      throw new InternalServerErrorException(`Payment initiation failed: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 2: Verify payment after callback
  // ─────────────────────────────────────────────────────────────────────────────

  async verifyPayment(token: string): Promise<VerifyPaymentResult> {
    this.logger.log(`[IYZICO] Verifying payment | token=${token}`);

    const sdk = this.getSdk();

    // Mock mode
    if (!sdk || token.startsWith('tok-mock-')) {
      this.logger.warn('[IYZICO] verifyPayment in MOCK mode — returning success');
      return {
        success:        true,
        status:         'success',
        paymentId:      `pay-mock-${uuidv4()}`,
        conversationId: `conv-placeholder`,
        paidPrice:      0,
        currency:       'TRY',
      };
    }

    try {
      const result = await iyzipayCall(sdk.checkoutForm, 'retrieve', {
        locale:         Iyzipay.LOCALE.TR,
        token,
      });

      const r = result as any;
      const isSuccess = r.paymentStatus === 'SUCCESS';

      this.logger.log(
        `[IYZICO] Payment ${isSuccess ? 'SUCCESS' : 'FAILED'} | paymentId=${r.paymentId} convId=${r.conversationId}`,
      );

      return {
        success:        isSuccess,
        status:         isSuccess ? 'success' : 'failure',
        paymentId:      r.paymentId ?? '',
        conversationId: r.conversationId ?? '',
        paidPrice:      parseFloat(r.paidPrice ?? '0'),
        currency:       r.currency ?? 'TRY',
      };
    } catch (err) {
      this.logger.error(`[IYZICO] verifyPayment failed | token=${token} err=${err.message}`);
      // Return failure rather than throwing — caller decides what to do
      return {
        success:        false,
        status:         'failure',
        paymentId:      '',
        conversationId: '',
        paidPrice:      0,
        currency:       'TRY',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 3: Refund
  // ─────────────────────────────────────────────────────────────────────────────

  async refundPayment(paymentId: string, amount: number): Promise<RefundResult> {
    this.logger.log(`[IYZICO] Refunding | paymentId=${paymentId} amount=${amount}`);

    const sdk = this.getSdk();

    // Mock mode
    if (!sdk) {
      this.logger.warn('[IYZICO] refundPayment in MOCK mode — returning success');
      return { success: true, refundId: `ref-mock-${uuidv4()}` };
    }

    try {
      const result = await iyzipayCall(sdk.refund, 'create', {
        locale:               Iyzipay.LOCALE.TR,
        conversationId:       `refund-${uuidv4()}`,
        paymentTransactionId: paymentId,
        price:                amount.toFixed(2),
        currency:             'TRY',
        ip:                   '85.34.78.112',
      });

      const r = result as any;
      this.logger.log(`[IYZICO] Refund SUCCESS | refundId=${r.paymentTransactionId}`);
      return { success: true, refundId: r.paymentTransactionId ?? '' };
    } catch (err) {
      this.logger.error(`[IYZICO] refundPayment failed | paymentId=${paymentId} err=${err.message}`);
      return { success: false, errorMessage: err.message };
    }
  }
}
