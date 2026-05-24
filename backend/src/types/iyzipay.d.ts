/**
 * Minimal type declarations for the `iyzipay` npm package.
 * The package ships no TypeScript types; these declarations
 * cover the subset of the API used in iyzico.service.ts.
 */
declare module 'iyzipay' {
  interface IyzipayConfig {
    apiKey: string;
    secretKey: string;
    uri: string;
  }

  interface IyzipayResource {
    create(request: Record<string, unknown>, callback: (err: Error | null, result: any) => void): void;
    retrieve(request: Record<string, unknown>, callback: (err: Error | null, result: any) => void): void;
  }

  class Iyzipay {
    constructor(config: IyzipayConfig);

    checkoutFormInitialize: IyzipayResource;
    checkoutForm: IyzipayResource;
    refund: IyzipayResource;

    static LOCALE: { TR: 'tr'; EN: 'en' };
    static PAYMENT_GROUP: { PRODUCT: 'PRODUCT'; LISTING: 'LISTING'; SUBSCRIPTION: 'SUBSCRIPTION' };
    static BASKET_ITEM_TYPE: { PHYSICAL: 'PHYSICAL'; VIRTUAL: 'VIRTUAL' };
    static PAYMENT_CHANNEL: { MOBILE: 'MOBILE'; WEB: 'WEB'; MOBILE_WEB: 'MOBILE_WEB'; MOBILE_IOS: 'MOBILE_IOS'; MOBILE_ANDROID: 'MOBILE_ANDROID' };
    static CURRENCY: { TRY: 'TRY'; EUR: 'EUR'; USD: 'USD'; GBP: 'GBP' };
    static STATUS: { SUCCESS: 'success'; FAILURE: 'failure' };
  }

  export = Iyzipay;
}
