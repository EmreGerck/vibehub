-- Sprint 13 Stage 1: Dual fulfilment model — foundation
-- ------------------------------------------------------------
-- Introduces FulfilmentType enum and the per-product / per-tenant /
-- per-orderItem column. Backfill defaults everything to VENDOR_MANAGED
-- so existing flow (flat commission via Tenant.commissionRate) is
-- preserved exactly. Stage 2 will layer in manufacturing cost + profit
-- share for VIBEHUB_MANAGED rows.
--
-- IF NOT EXISTS guards each statement so re-runs are idempotent (matches
-- the convention used by 20260528040000_add_hot_path_indexes).

-- 1) The enum itself
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FulfilmentType') THEN
    CREATE TYPE "FulfilmentType" AS ENUM ('VIBEHUB_MANAGED', 'VENDOR_MANAGED');
  END IF;
END$$;

-- 2) Tenant.defaultFulfilment — default for new products from this vendor
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "defaultFulfilment" "FulfilmentType" NOT NULL DEFAULT 'VENDOR_MANAGED';

-- 3) Product.fulfilment — per-product override of the tenant default
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "fulfilment" "FulfilmentType" NOT NULL DEFAULT 'VENDOR_MANAGED';

-- 4) OrderItem.fulfilment — snapshot at order time; immutable once written
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "fulfilment" "FulfilmentType" NOT NULL DEFAULT 'VENDOR_MANAGED';
