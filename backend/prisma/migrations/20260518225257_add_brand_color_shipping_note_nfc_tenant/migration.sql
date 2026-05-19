-- AlterTable
ALTER TABLE "NfcTag" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "shippingNote" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "brandColor" TEXT;

-- CreateIndex
CREATE INDEX "NfcTag_tenantId_idx" ON "NfcTag"("tenantId");

-- AddForeignKey
ALTER TABLE "NfcTag" ADD CONSTRAINT "NfcTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
