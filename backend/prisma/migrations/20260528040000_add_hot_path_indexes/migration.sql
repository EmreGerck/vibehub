-- Sprint 12 E3: Hot-path indexes
-- ------------------------------------------------------------
-- Adds 4 composite indexes for the dashboard / vendor pages that
-- got slow as beta data accumulated. AuditLog([action, createdAt])
-- already exists from a previous migration — skipped.
--
-- NOTE: Original version tried CREATE INDEX CONCURRENTLY but Prisma
-- wraps every migration in a transaction (P3018 / SQLSTATE 25001).
-- Switched to plain CREATE INDEX — tables are small enough at this
-- stage of the platform that the brief AccessExclusive lock during
-- index build is acceptable. Revisit when row counts exceed ~1M.
--
-- IF NOT EXISTS guards each statement so re-runs are idempotent.

-- Order: admin orders page filters by status + sorts by createdAt desc.
-- (Order has no tenantId column — vendor lives on OrderItem.)
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx"
  ON "Order" ("status", "createdAt" DESC);

-- Product: vendor product-list page filters by status + tenantId.
CREATE INDEX IF NOT EXISTS "Product_status_tenantId_idx"
  ON "Product" ("status", "tenantId");

-- OrderItem: vendor "my orders" page filters tenantId + sorts by createdAt desc.
CREATE INDEX IF NOT EXISTS "OrderItem_tenantId_createdAt_idx"
  ON "OrderItem" ("tenantId", "createdAt" DESC);

-- AppNotification: unread badge polls COUNT(*) WHERE userId=? AND readAt IS NULL.
CREATE INDEX IF NOT EXISTS "AppNotification_userId_readAt_idx"
  ON "AppNotification" ("userId", "readAt");
