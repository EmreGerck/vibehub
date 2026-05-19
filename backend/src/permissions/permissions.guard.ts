import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, VendorPermission } from '@prisma/client';
import { VENDOR_PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionsService } from './permissions.service';

/**
 * Enforces @RequirePermissions(...) on routes. Runs after JwtAuthGuard + RolesGuard.
 * - GOD_USER / PLATFORM_ADMIN: bypass all checks.
 * - VENDOR_OWNER / VENDOR_MANAGER: must have every required permission on their tenant.
 * - Anything else: 403.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<VendorPermission[]>(
      VENDOR_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Not authenticated');

    if (user.role === UserRole.GOD_USER || user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    if (user.role !== UserRole.VENDOR_OWNER && user.role !== UserRole.VENDOR_MANAGER) {
      throw new ForbiddenException('This action is restricted to vendor accounts');
    }

    if (!user.tenantId) {
      throw new ForbiddenException('No store associated with this account');
    }

    const granted = await this.permissions.getTenantPermissions(user.tenantId);
    const missing = required.filter((p) => !granted.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Your store lacks required permission(s): ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
