-- CreateEnum
CREATE TYPE "ReactionEmoji" AS ENUM ('FIRE', 'HEART', 'CLAP', 'EYES', 'HUNDRED', 'ROCKET');

-- AlterTable
ALTER TABLE "ForumReply" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isArtistAnswer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentReplyId" TEXT;

-- AlterTable
ALTER TABLE "ForumTopic" ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "hasArtistReply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ForumChannel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '💬',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" "ReactionEmoji" NOT NULL,
    "topicId" TEXT,
    "replyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForumChannel_tenantId_sortOrder_idx" ON "ForumChannel"("tenantId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ForumChannel_tenantId_slug_key" ON "ForumChannel"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ForumReaction_topicId_idx" ON "ForumReaction"("topicId");

-- CreateIndex
CREATE INDEX "ForumReaction_replyId_idx" ON "ForumReaction"("replyId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumReaction_userId_emoji_topicId_key" ON "ForumReaction"("userId", "emoji", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumReaction_userId_emoji_replyId_key" ON "ForumReaction"("userId", "emoji", "replyId");

-- CreateIndex
CREATE INDEX "ForumTopic_tenantId_channelId_createdAt_idx" ON "ForumTopic"("tenantId", "channelId", "createdAt");

-- AddForeignKey
ALTER TABLE "ForumChannel" ADD CONSTRAINT "ForumChannel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumTopic" ADD CONSTRAINT "ForumTopic_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ForumChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_parentReplyId_fkey" FOREIGN KEY ("parentReplyId") REFERENCES "ForumReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ForumTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "ForumReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
