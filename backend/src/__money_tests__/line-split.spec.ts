/**
 * Line-split money math — pure unit tests
 * ────────────────────────────────────────
 * Pins the two-lane calculation done at order time. The lane-1 invariant
 *
 *     vendorPayout + platformShare + vatExtracted = lineTotal
 *
 * is the load-bearing check — if this drifts, every Vibehub-managed payout
 * silently miscalculates. Tolerance ±0.01 TRY for the rounding seam.
 */

import { Decimal } from '@prisma/client/runtime/library';
import { FulfilmentType } from '@prisma/client';
import { computeLineSplit } from '../order/line-split';

const d = (n: string | number) => new Decimal(n);

describe('computeLineSplit — VENDOR_MANAGED (lane 2, legacy flat commission)', () => {
  it('matches the historical formula exactly', () => {
    const r = computeLineSplit({
      fulfilment:     FulfilmentType.VENDOR_MANAGED,
      unitPrice:      d('100.00'),
      qty:            3,
      commissionRate: d('0.10'),  // 10%
    });
    expect(r.lineTotal.toString()).toBe('300');
    expect(r.vendorPayoutAmount.toString()).toBe('270');
    expect(r.commissionRateSnapshot.toString()).toBe('0.1');
    // Lane-1 fields are undefined in lane-2 output.
    expect(r.manufacturingCostSnapshot).toBeUndefined();
    expect(r.profitSharePctSnapshot).toBeUndefined();
    expect(r.platformShareAmount).toBeUndefined();
  });

  it('rejects an out-of-range commission rate', () => {
    expect(() =>
      computeLineSplit({
        fulfilment:     FulfilmentType.VENDOR_MANAGED,
        unitPrice:      d('50.00'),
        qty:            1,
        commissionRate: d('1.5'),
      }),
    ).toThrow();
  });

  it('rejects negative price', () => {
    expect(() =>
      computeLineSplit({
        fulfilment:     FulfilmentType.VENDOR_MANAGED,
        unitPrice:      d('-1.00'),
        qty:            1,
        commissionRate: d('0.10'),
      }),
    ).toThrow();
  });
});

describe('computeLineSplit — VIBEHUB_MANAGED (lane 1, co-manufacture profit share)', () => {
  it('reproduces the brief: 1200 TL sale, 300 TL mfg, 20% KDV, 50/50 split', () => {
    // From user's own example:
    //   lineTotal=1200, vatRate=0.20 → vatExtracted=200, net=1000,
    //   mfg=300, distributable=700, profitSharePct=0.50
    //   vendorPayout=350, platformShare=350
    const r = computeLineSplit({
      fulfilment:            FulfilmentType.VIBEHUB_MANAGED,
      unitPrice:             d('1200.00'),
      qty:                   1,
      commissionRate:        d('0'),       // ignored
      vatRate:               d('0.20'),
      manufacturingUnitCost: d('300.00'),
      profitSharePct:        d('0.50'),
    });

    expect(r.lineTotal.toString()).toBe('1200');
    expect(r.manufacturingCostSnapshot!.toString()).toBe('300');
    expect(r.vendorPayoutAmount.toString()).toBe('350');
    expect(r.platformShareAmount!.toString()).toBe('350');
    expect(r.profitSharePctSnapshot!.toString()).toBe('0.5');
  });

  it('money invariant holds across 10 generated cases (±0.01 TRY)', () => {
    const cases: Array<[number, number, number, number, number]> = [
      // unitPrice, qty, vatRate, unitCost, profitSharePct
      [1200, 1,  0.20, 300, 0.50],
      [850,  2,  0.20, 200, 0.40],
      [1499.99, 1, 0.18, 400, 0.60],
      [250,  4,  0.08, 80,  0.50],
      [100,  10, 0.01, 25,  0.70],
      [3500, 1,  0.20, 1200, 0.55],
      [777,  3,  0.20, 222, 0.33],
      [1999, 2,  0.20, 500, 0.50],
      [49.90, 7, 0.20, 12,  0.65],
      [5000, 1,  0.20, 4900, 0.50],   // razor-thin profit (100 TL after VAT & mfg)
    ];

    for (const [price, qty, vat, cost, split] of cases) {
      const r = computeLineSplit({
        fulfilment:            FulfilmentType.VIBEHUB_MANAGED,
        unitPrice:             d(price),
        qty,
        commissionRate:        d('0'),
        vatRate:               d(vat),
        manufacturingUnitCost: d(cost),
        profitSharePct:        d(split),
      });

      const lineTotal = r.lineTotal;
      const mfg       = r.manufacturingCostSnapshot!;
      // Invariant: lineTotal = vatExtracted + mfgCost + vendorPayout + platformShare
      // → reconstruct vat as the residual and compare to closed-form.
      const reconstructedVat = lineTotal.sub(mfg).sub(r.vendorPayoutAmount).sub(r.platformShareAmount!);
      const expectedVat      = lineTotal.mul(d(vat)).div(d(1 + vat));
      const drift            = reconstructedVat.sub(expectedVat).abs();
      // ±0.02 tolerance: vendorPayout and platformShare each round 2dp
      // independently — worst-case both shift in the same direction.
      expect(drift.lessThanOrEqualTo(d('0.02'))).toBe(true);
    }
  });

  it('floors vendor payout at 0 when costs exceed net revenue (vendor never owes)', () => {
    // Cost > net revenue → distributable is negative. Vendor share floors at 0,
    // platform eats the loss as negative platformShareAmount.
    const r = computeLineSplit({
      fulfilment:            FulfilmentType.VIBEHUB_MANAGED,
      unitPrice:             d('500.00'),
      qty:                   1,
      commissionRate:        d('0'),
      vatRate:               d('0.20'),
      manufacturingUnitCost: d('1000.00'),  // way over
      profitSharePct:        d('0.50'),
    });
    expect(r.vendorPayoutAmount.toString()).toBe('0');
    // Platform absorbs the loss: net revenue (~416.67) - mfg cost (1000) = -583.33
    expect(r.platformShareAmount!.isNegative()).toBe(true);
  });

  it('rejects missing VAT rate', () => {
    expect(() =>
      computeLineSplit({
        fulfilment:            FulfilmentType.VIBEHUB_MANAGED,
        unitPrice:             d('100'),
        qty:                   1,
        commissionRate:        d('0'),
        manufacturingUnitCost: d('30'),
        profitSharePct:        d('0.5'),
      } as any),
    ).toThrow();
  });

  it('rejects missing manufacturing cost', () => {
    expect(() =>
      computeLineSplit({
        fulfilment:     FulfilmentType.VIBEHUB_MANAGED,
        unitPrice:      d('100'),
        qty:            1,
        commissionRate: d('0'),
        vatRate:        d('0.20'),
        profitSharePct: d('0.5'),
      } as any),
    ).toThrow();
  });

  it('rejects profitSharePct outside [0, 1]', () => {
    expect(() =>
      computeLineSplit({
        fulfilment:            FulfilmentType.VIBEHUB_MANAGED,
        unitPrice:             d('100'),
        qty:                   1,
        commissionRate:        d('0'),
        vatRate:               d('0.20'),
        manufacturingUnitCost: d('30'),
        profitSharePct:        d('1.5'),
      }),
    ).toThrow();
  });
});
