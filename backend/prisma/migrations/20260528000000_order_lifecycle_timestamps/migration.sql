-- Add lifecycle timestamps to Order so the customer-facing timeline
-- can show when each status was reached. Existing orders default to NULL —
-- the frontend OrderTimeline component handles missing timestamps gracefully.
ALTER TABLE "Order"
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "shippedAt"   TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3);
