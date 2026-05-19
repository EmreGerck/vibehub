-- AlterTable
ALTER TABLE "PlatformSettings" ALTER COLUMN "platformName" SET DEFAULT 'VibeHub',
ALTER COLUMN "supportEmail" SET DEFAULT 'support@vibehub.com.tr',
ALTER COLUMN "metaTitle" SET DEFAULT 'VibeHub — Your Merch, Your Stage';

-- AlterTable
ALTER TABLE "TrustedDevice" ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lockedUntil" TIMESTAMP(3);
