-- Sprint 13 Stage 2: Manufacturing cost + profit share
-- ------------------------------------------------------------
-- Introduces the ManufacturingUnit table (shared catalogue of base costs)
-- and the columns needed for the lane-1 (VIBEHUB_MANAGED) money math:
--   Product.manufacturingUnitId  → which base unit cost applies
--   Product.profitSharePct       → vendor's share of post-cost profit
--   OrderItem.manufacturingCostSnapshot, profitSharePctSnapshot,
--   platformShareAmount          → frozen at order time so payouts
--                                  don't shift if cost or split is edited
--
-- All new columns are nullable — they are only meaningful when the
-- snapshot's fulfilment = 'VIBEHUB_MANAGED'. Lane-2 rows continue to
-- leave them NULL, matching every historical row.
--
-- IF NOT EXISTS guards each statement so re-runs are idempotent.

-- 1) ManufacturingUnit table
CREATE TABLE IF NOT EXISTS "ManufacturingUnit" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "unitCostTRY" DECIMAL(12, 2) NOT NULL,
  "notes"       TEXT,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManufacturingUnit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ManufacturingUnit_active_idx"
  ON "ManufacturingUnit" ("active");

CREATE INDEX IF NOT EXISTS "ManufacturingUnit_name_idx"
  ON "ManufacturingUnit" ("name");

-- 2) Product: link + profit share
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "manufacturingUnitId" TEXT,
  ADD COLUMN IF NOT EXISTS "profitSharePct"      DECIMAL(5, 4);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Product_manufacturingUnitId_fkey'
  ) THEN
    ALTER TABLE "Product"
      ADD CONSTRAINT "Product_manufacturingUnitId_fkey"
      FOREIGN KEY ("manufacturingUnitId")
      REFERENCES "ManufacturingUnit"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "Product_manufacturingUnitId_idx"
  ON "Product" ("manufacturingUnitId");

-- 3) OrderItem: snapshot fields for lane-1 payouts
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "manufacturingCostSnapshot" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "profitSharePctSnapshot"    DECIMAL(5, 4),
  ADD COLUMN IF NOT EXISTS "platformShareAmount"       DECIMAL(12, 2);
