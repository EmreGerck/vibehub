-- Add REFUND_REQUESTED to OrderStatus enum
-- Note: PostgreSQL requires ALTER TYPE outside transactions
ALTER TYPE "OrderStatus" ADD VALUE 'REFUND_REQUESTED';

-- Add refund tracking fields to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundReason"      TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundNote"        TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundRequestedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundedAt"        TIMESTAMP(3);
