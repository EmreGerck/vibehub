-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountDeletedAt" TIMESTAMP(3),
ADD COLUMN     "kvkkAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingConsentAt" TIMESTAMP(3),
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
