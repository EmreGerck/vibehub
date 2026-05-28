-- Sprint 12 E3: Hot-path indexes
-- ------------------------------------------------------------
-- Adds 4 composite indexes for the dashboard / vendor pages that
-- got slow as beta data accumulated. AuditLog([action, createdAt])
-- already exists from a previous migration — skipped.
--
-- IMPORTANT: This migration MUST run with CREATE INDEX CONCURRENTLY
-- so it doesn't lock the affected tables in production. Prisma's
-- migrate engine wraps every migration in a transaction by default,
-- but CONCURRENTLY cannot run inside a transaction — so we use the
-- raw SQL form below and `prisma migrate deploy` will execute it
-- statement-by-statement outside a TX (Prisma >=5 honours statement
-- boundaries when no BEGIN/COMMIT is present in the SQL file).
--
-- IF NOT EXISTS guards each statement so re-runs are idempotent.

-- Order: admin orders page filters by status + sorts by createdAt desc.
-- (Order has no tenantId column — vendor lives on OrderItem.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Order_status_createdAt_idx"
  ON "Order" ("status", "createdAt" DESC);

-- Product: vendor product-list page filters by status + tenantId.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_status_tenantId_idx"
  ON "Product" ("status", "tenantId");

-- OrderItem: vendor "my orders" page filters tenantId + sorts by createdAt desc.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OrderItem_tenantId_createdAt_idx"
  ON "OrderItem" ("tenantId", "createdAt" DESC);

-- AppNotification: unread badge polls COUNT(*) WHERE userId=? AND readAt IS NULL.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AppNotification_userId_readAt_idx"
  ON "AppNotification" ("userId", "readAt");
