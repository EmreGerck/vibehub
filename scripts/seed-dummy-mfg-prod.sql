-- ────────────────────────────────────────────────────────────────────────
-- Dummy data for Sprint 13 verification (pre-launch, removable)
--
-- Creates ONE ManufacturingUnit, flips ONE existing product to
-- VIBEHUB_MANAGED, links the unit, and sets a 50/50 profit share.
-- All IDs are stable so re-runs are no-ops; rollback at the bottom of
-- this file (commented out) deletes everything by id.
--
-- Run from local shell:
--   ssh root@vibehub.com.tr 'docker exec -i vibehub_postgres psql -U vibehub -d vibehub' < scripts/seed-dummy-mfg-prod.sql
-- (Adjust -U / -d if your psql user differs — see INFRASTRUCTURE.md.)
--
-- Once this lands, log into /dashboard/admin/manufacturing to see the
-- unit, /dashboard/admin/products to see the 🏭 button highlighted on
-- "ESENBOĞA", and /product/<id> to see the new "Kargo: VibeHub" badge.
-- ────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1) Insert the dummy manufacturing unit (idempotent by fixed UUID).
INSERT INTO "ManufacturingUnit" (id, name, "unitCostTRY", notes, active, "createdAt", "updatedAt")
VALUES (
  '00000000-1111-2222-3333-000000000001',
  'TEST — Oversize Tişört Beyaz',
  300.00,
  'Sprint 13 verification dummy. Sil-istenirse ROLLBACK bloğunu çalıştır.',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "unitCostTRY" = EXCLUDED."unitCostTRY",
  notes         = EXCLUDED.notes,
  "updatedAt"   = NOW();

-- 2) Flip the ESENBOĞA product to VIBEHUB_MANAGED + link the unit + 50/50.
--    Targets the specific product id observed via the public API. If the
--    product no longer exists (e.g. archived), the UPDATE will be a no-op.
UPDATE "Product"
SET
  "fulfilment"          = 'VIBEHUB_MANAGED',
  "manufacturingUnitId" = '00000000-1111-2222-3333-000000000001',
  "profitSharePct"      = 0.5000,
  "updatedAt"           = NOW()
WHERE id = '640e1520-56da-4a63-bd23-c87855d38de3'
  -- Safety belt: only flip if no order items exist yet (mirrors the
  -- application-level lock-after-first-order guard).
  AND NOT EXISTS (
    SELECT 1
    FROM   "OrderItem" oi
    JOIN   "ProductVariant" pv ON oi."variantId" = pv.id
    WHERE  pv."productId" = '640e1520-56da-4a63-bd23-c87855d38de3'
  );

-- Show the result of the flip so the user can see what changed.
SELECT id, title, fulfilment, "manufacturingUnitId", "profitSharePct"
FROM   "Product"
WHERE  id = '640e1520-56da-4a63-bd23-c87855d38de3';

COMMIT;

-- ────────────────────────────────────────────────────────────────────────
-- ROLLBACK (paste-and-run when you're ready to remove the dummy data):
--
--   UPDATE "Product"
--   SET    "fulfilment" = 'VENDOR_MANAGED',
--          "manufacturingUnitId" = NULL,
--          "profitSharePct"      = NULL,
--          "updatedAt"           = NOW()
--   WHERE  id = '640e1520-56da-4a63-bd23-c87855d38de3';
--
--   DELETE FROM "ManufacturingUnit"
--   WHERE  id = '00000000-1111-2222-3333-000000000001';
--
-- ────────────────────────────────────────────────────────────────────────
