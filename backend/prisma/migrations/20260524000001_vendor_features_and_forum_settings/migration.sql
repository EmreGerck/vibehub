-- =============================================================================
-- Vendor feature toggles + forum sub-settings
-- =============================================================================

-- ── New enums for forum settings ────────────────────────────────────────────
CREATE TYPE "ForumModerationMode" AS ENUM ('OPEN', 'PRE_MODERATED', 'LOCKED');
CREATE TYPE "ForumVisibility"     AS ENUM ('PUBLIC', 'MEMBERS_ONLY', 'FOLLOWERS_ONLY');
CREATE TYPE "ForumPostingPolicy"  AS ENUM ('EVERYONE', 'VERIFIED_ONLY', 'FOLLOWERS_ONLY');

-- ── Tenant: per-vendor feature toggles (god-user controlled) ────────────────
ALTER TABLE "Tenant"
  ADD COLUMN "forumEnabled"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "mediaEnabled"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "eventsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "nfcEnabled"    BOOLEAN NOT NULL DEFAULT true;

-- ── ForumSettings: comprehensive sub-settings ───────────────────────────────
-- Moderation
ALTER TABLE "ForumSettings"
  ADD COLUMN "moderationMode" "ForumModerationMode" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "allowAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- Content rules
ALTER TABLE "ForumSettings"
  ADD COLUMN "minPostLength"  INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "maxPostLength"  INTEGER NOT NULL DEFAULT 5000,
  ADD COLUMN "allowImages"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowLinks"     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowMentions"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowReactions" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowReplies"   BOOLEAN NOT NULL DEFAULT true;

-- Rate limiting
ALTER TABLE "ForumSettings"
  ADD COLUMN "slowModeSeconds" INTEGER NOT NULL DEFAULT 0;

-- Access & posting policy
ALTER TABLE "ForumSettings"
  ADD COLUMN "visibility"    "ForumVisibility"    NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "postingPolicy" "ForumPostingPolicy" NOT NULL DEFAULT 'EVERYONE';

-- Auto-moderation
ALTER TABLE "ForumSettings"
  ADD COLUMN "bannedKeywords"  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "autoArchiveDays" INTEGER NOT NULL DEFAULT 0;

-- Community
ALTER TABLE "ForumSettings"
  ADD COLUMN "welcomeMessage" TEXT,
  ADD COLUMN "rulesText"      TEXT;
