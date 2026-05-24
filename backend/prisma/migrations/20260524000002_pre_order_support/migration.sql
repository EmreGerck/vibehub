-- =============================================================================
-- Pre-order support
-- =============================================================================

CREATE TYPE "PreOrderStatus" AS ENUM (
  'AWAITING_APPROVAL',
  'APPROVED',
  'PRODUCTION',
  'SHIPPED',
  'CANCELLED'
);

-- Product: pre-order metadata (set by vendor / admin when creating/editing)
ALTER TABLE "Product"
  ADD COLUMN "isPreOrder"        BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN "preOrderShipDate"  TIMESTAMP(3),
  ADD COLUMN "preOrderEndsAt"    TIMESTAMP(3),
  ADD COLUMN "preOrderLimit"     INTEGER;

-- OrderItem: snapshot at order time so future product edits don't change history
ALTER TABLE "OrderItem"
  ADD COLUMN "isPreOrder"       BOOLEAN          NOT NULL DEFAULT false,
  ADD COLUMN "preOrderStatus"   "PreOrderStatus",
  ADD COLUMN "preOrderShipDate" TIMESTAMP(3),
  ADD COLUMN "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Index used by /admin/pre-orders listing
CREATE INDEX "OrderItem_isPreOrder_preOrderStatus_idx"
  ON "OrderItem"("isPreOrder", "preOrderStatus");
