-- Sprint 10: NFC industrial-scale tooling
-- Goal: support 1000s of static-URL tags + per-person tag assignment + fast search.

ALTER TABLE "NfcTag"
  ADD COLUMN "assignedToUserId" TEXT,
  ADD COLUMN "batchId"          TEXT,
  ADD COLUMN "notes"             TEXT;

-- FK for per-person assignment (SET NULL on user delete — tag survives, ownership clears)
ALTER TABLE "NfcTag"
  ADD CONSTRAINT "NfcTag_assignedToUserId_fkey"
  FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes for the new admin search/filter UI
CREATE INDEX "NfcTag_assignedToUserId_idx" ON "NfcTag"("assignedToUserId");
CREATE INDEX "NfcTag_batchId_idx"          ON "NfcTag"("batchId");
CREATE INDEX "NfcTag_createdAt_idx"        ON "NfcTag"("createdAt" DESC);
