// Jest manual mock for iyzipay (CommonJS package loaded via require())
const Iyzipay = jest.fn().mockImplementation(() => ({
  checkoutFormInitialize: { create: jest.fn() },
  checkoutForm:           { retrieve: jest.fn() },
  refund:                 { create: jest.fn() },
}));
(Iyzipay as any).LOCALE           = { TR: 'tr', EN: 'en' };
(Iyzipay as any).PAYMENT_GROUP    = { PRODUCT: 'PRODUCT' };
(Iyzipay as any).BASKET_ITEM_TYPE = { PHYSICAL: 'PHYSICAL' };
module.exports = Iyzipay;
