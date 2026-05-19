-- CreateEnum
CREATE TYPE "VendorPermission" AS ENUM ('PRODUCT_CREATE', 'PRODUCT_EDIT', 'PRODUCT_DELETE', 'PRODUCT_SUBMIT', 'PRODUCT_PUBLISH_DIRECT', 'VARIANT_MANAGE', 'INVENTORY_EDIT', 'ORDER_VIEW', 'ORDER_FULFILL', 'STOREFRONT_EDIT', 'PAYOUT_REQUEST', 'ANALYTICS_VIEW', 'MANAGER_INVITE');

-- CreateTable
CREATE TABLE "TenantPermission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "permission" "VendorPermission" NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "TenantPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantPermission_tenantId_idx" ON "TenantPermission"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantPermission_tenantId_permission_key" ON "TenantPermission"("tenantId", "permission");

-- AddForeignKey
ALTER TABLE "TenantPermission" ADD CONSTRAINT "TenantPermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
