-- Drop existing FK so we can change column nullability
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- Make actorId and targetId nullable for anonymous security events
ALTER TABLE "AuditLog" ALTER COLUMN "actorId" DROP NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "targetId" DROP NOT NULL;

-- Re-add FK with ON DELETE SET NULL so deleting a user doesn't blow away their audit trail
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for filtering by action (admin Security tab queries by action IN (...))
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
