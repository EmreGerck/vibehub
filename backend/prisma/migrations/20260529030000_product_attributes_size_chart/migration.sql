-- Sprint 13 Stage 3: Structured product attributes + size chart
-- ------------------------------------------------------------
-- Adds two pairs of JSON columns:
--
--   Category.attributeSchema    → defines what spec fields a product in
--                                 this category should carry (vendor form +
--                                 customer "Özellikler" panel render from it).
--   Category.sizeChartTemplate  → default size chart shape per category.
--
--   Product.attributes          → actual filled spec values, e.g.
--                                 { material: "100% pamuk", fit: "oversize", nfc: true }.
--   Product.sizeChart           → optional per-product override of the
--                                 category's template.
--
-- All columns nullable; no backfill needed — existing rows simply show no
-- spec panel / no size table until a vendor fills them or GOD_USER seeds
-- the schemas.
--
-- IF NOT EXISTS guards for idempotent re-runs.

ALTER TABLE "Category"
  ADD COLUMN IF NOT EXISTS "attributeSchema"   JSONB,
  ADD COLUMN IF NOT EXISTS "sizeChartTemplate" JSONB;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "attributes" JSONB,
  ADD COLUMN IF NOT EXISTS "sizeChart"  JSONB;
