-- Lightweight page-view analytics for device intelligence.
-- Goal: tell the admin which phone brands/models customers use, so they
-- can make product decisions ("most fans are on Samsung — make that hoodie pocket-sized for S24 Ultra").

CREATE TABLE "PageView" (
  "id"          TEXT NOT NULL,
  "ipHash"      TEXT,
  "browser"     TEXT,
  "browserVer"  TEXT,
  "os"          TEXT,
  "osVer"       TEXT,
  "deviceType"  TEXT,
  "deviceBrand" TEXT,
  "deviceModel" TEXT,
  "path"        TEXT NOT NULL,
  "referer"     TEXT,
  "userId"      TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt" DESC);
CREATE INDEX "PageView_deviceBrand_deviceModel_idx" ON "PageView"("deviceBrand", "deviceModel");
CREATE INDEX "PageView_os_idx" ON "PageView"("os");
CREATE INDEX "PageView_deviceType_idx" ON "PageView"("deviceType");
CREATE INDEX "PageView_userId_idx" ON "PageView"("userId");

-- Soft FK to User (SET NULL on user delete — analytics survive)
ALTER TABLE "PageView"
  ADD CONSTRAINT "PageView_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
