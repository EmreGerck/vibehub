import { Decimal } from '@prisma/client/runtime/library';
import { FulfilmentType } from '@prisma/client';
import { CodedException } from '../common/coded-exception';

/**
 * Single source of truth for the per-line money split at order time.
 *
 * Two lanes, picked by `fulfilment`:
 *
 *   VENDOR_MANAGED  (legacy / default)
 *     vendor manufactures and ships; VibeHub takes flat commission.
 *       lineTotal       = unitPrice × qty
 *       platformFee     = lineTotal × commissionRate
 *       vendorPayout    = lineTotal − platformFee
 *
 *   VIBEHUB_MANAGED (co-manufacture)
 *     VibeHub manufactures and ships; profit split with the artist after
 *     VAT and manufacturing cost.
 *       lineTotal           = unitPrice × qty
 *       vatExtracted        = lineTotal × vatRate / (1 + vatRate)
 *       netRevenue          = lineTotal − vatExtracted
 *       mfgCost             = unitCostTRY × qty
 *       distributableProfit = netRevenue − mfgCost          // can be negative
 *       vendorPayout        = max(distributableProfit × profitSharePct, 0)
 *       platformShare       = distributableProfit − vendorPayout
 *
 * All math is in Decimal; only the final returned amounts are rounded to 2dp
 * (snapshot precision). The lane-1 invariant
 *
 *   vendorPayout + platformShare + vatExtracted = lineTotal
 *
 * holds within ±0.01 TRY tolerance (the unavoidable rounding seam between
 * extracted VAT and the post-cost split).
 *
 * `vendorPayoutAmount` is the field stored on OrderItem in both lanes so
 * downstream (payouts, vendor emails) can stay lane-agnostic.
 */

export interface LineSplitInput {
  fulfilment: FulfilmentType;
  unitPrice: Decimal;
  qty: number;
  // Lane 2 only — flat commission for the vendor's tenant.
  commissionRate: Decimal;
  // Lane 1 only — category VAT, mfg unit cost, vendor's share of post-cost profit.
  vatRate?: Decimal;
  manufacturingUnitCost?: Decimal | null;
  profitSharePct?: Decimal | null;
  // Display labels used only when throwing a friendly error.
  productTitle?: string;
  storeName?: string;
}

export interface LineSplitOutput {
  // Common
  lineTotal: Decimal;
  unitPriceSnapshot: Decimal;
  commissionRateSnapshot: Decimal;   // VENDOR_MANAGED: real rate. VIBEHUB_MANAGED: 0.
  vendorPayoutAmount: Decimal;
  // Lane 1 only — undefined for VENDOR_MANAGED.
  manufacturingCostSnapshot?: Decimal;
  profitSharePctSnapshot?: Decimal;
  platformShareAmount?: Decimal;
}

const ZERO  = new Decimal(0);
const ONE   = new Decimal(1);
const TWO_DP = 2;

function r2(d: Decimal): Decimal {
  return d.toDecimalPlaces(TWO_DP, Decimal.ROUND_HALF_UP);
}

export function computeLineSplit(input: LineSplitInput): LineSplitOutput {
  const { fulfilment, unitPrice, qty, commissionRate } = input;
  const label = input.productTitle ?? 'ürün';

  if (unitPrice.isNegative()) {
    throw new Error(`Invalid price for "${label}"`);
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error(`Invalid quantity for "${label}"`);
  }

  const lineTotal = unitPrice.mul(qty);

  // ── Lane 2: flat commission (unchanged historical behaviour) ───────────────
  if (fulfilment === FulfilmentType.VENDOR_MANAGED) {
    if (commissionRate.isNegative() || commissionRate.greaterThan(ONE)) {
      throw new CodedException('VH-1004', {
        storeName: input.storeName ?? 'vendor',
        commissionRate: commissionRate.toString(),
      });
    }
    const platformFee  = lineTotal.mul(commissionRate);
    const vendorPayout = lineTotal.sub(platformFee);
    return {
      lineTotal:              r2(lineTotal),
      unitPriceSnapshot:      unitPrice,
      commissionRateSnapshot: commissionRate,
      vendorPayoutAmount:     r2(vendorPayout),
    };
  }

  // ── Lane 1: VibeHub-managed → strip VAT, deduct mfg cost, split remainder ──
  if (!input.vatRate || input.vatRate.isNegative() || input.vatRate.greaterThan(ONE)) {
    throw new CodedException('VH-1003', { productTitle: label, vatRate: input.vatRate?.toString() ?? null });
  }
  if (input.manufacturingUnitCost == null || input.manufacturingUnitCost.isNegative()) {
    throw new CodedException('VH-1001', { productTitle: label });
  }
  if (
    input.profitSharePct == null ||
    input.profitSharePct.isNegative() ||
    input.profitSharePct.greaterThan(ONE)
  ) {
    throw new CodedException('VH-1002', {
      productTitle: label,
      profitSharePct: input.profitSharePct?.toString() ?? null,
    });
  }

  const vatRate         = input.vatRate;
  const unitCost        = input.manufacturingUnitCost;
  const profitSharePct  = input.profitSharePct;

  // VAT extracted (the seller-side portion of the price that is KDV).
  //   vatExtracted = lineTotal × vatRate / (1 + vatRate)
  const vatExtracted = lineTotal.mul(vatRate).div(ONE.add(vatRate));
  const netRevenue   = lineTotal.sub(vatExtracted);

  const mfgCost             = unitCost.mul(qty);
  const distributableProfit = netRevenue.sub(mfgCost);

  // If costs exceed net revenue, vendor's share floors at 0 (we don't ask the
  // vendor to pay back; VibeHub eats the loss as platformShare). This keeps the
  // invariant numerically clean and aligned with the artist's expectation.
  const rawVendorShare = distributableProfit.mul(profitSharePct);
  const vendorPayout   = rawVendorShare.isNegative() ? ZERO : rawVendorShare;
  const platformShare  = distributableProfit.sub(vendorPayout);

  return {
    lineTotal:                 r2(lineTotal),
    unitPriceSnapshot:         unitPrice,
    commissionRateSnapshot:    ZERO,             // not used in lane 1, but required NOT NULL
    vendorPayoutAmount:        r2(vendorPayout),
    manufacturingCostSnapshot: r2(mfgCost),
    profitSharePctSnapshot:    profitSharePct,
    platformShareAmount:       r2(platformShare),
  };
}
