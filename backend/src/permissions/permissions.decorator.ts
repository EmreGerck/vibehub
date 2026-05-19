import { SetMetadata } from '@nestjs/common';
import { VendorPermission } from '@prisma/client';

export const VENDOR_PERMISSIONS_KEY = 'vendor_permissions';

/**
 * Marks an endpoint as requiring one or more VendorPermissions.
 * GOD_USER and PLATFORM_ADMIN bypass these checks.
 * VENDOR_OWNER / VENDOR_MANAGER must have ALL listed permissions on their tenant.
 */
export const RequirePermissions = (...perms: VendorPermission[]) =>
  SetMetadata(VENDOR_PERMISSIONS_KEY, perms);
