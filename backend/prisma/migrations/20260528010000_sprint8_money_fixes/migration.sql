-- Sprint 8: Money & Compliance migrations
-- ------------------------------------------------------------
-- 1. Per-category VAT rate (Turkish KDV: %1, %8, %18, %20 depending on goods).
--    Default 0.20 matches merch (textiles, accessories). Admin can set per category.
ALTER TABLE "Category"
  ADD COLUMN "vatRate" DECIMAL(4,3) NOT NULL DEFAULT 0.200;

-- 2. Index Payout(tenantId, periodStart, periodEnd) for overlap detection.
--    Without this, every Payout.create would full-scan to check overlaps.
CREATE INDEX "Payout_tenantId_periodStart_periodEnd_idx"
  ON "Payout"("tenantId", "periodStart", "periodEnd");
