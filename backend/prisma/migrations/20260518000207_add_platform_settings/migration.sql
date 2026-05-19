-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "defaultCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "platformName" TEXT NOT NULL DEFAULT 'MerchStage',
    "supportEmail" TEXT NOT NULL DEFAULT 'support@merch.stage',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "vendorSignupsOpen" BOOLEAN NOT NULL DEFAULT true,
    "productSubmissionsOpen" BOOLEAN NOT NULL DEFAULT true,
    "globalForumEnabled" BOOLEAN NOT NULL DEFAULT true,
    "requirePurchaseReview" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);
