import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { VendorPermission } from '@prisma/client';
import {
  ALL_VENDOR_PERMISSIONS,
  DEFAULT_VENDOR_PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
} from './permissions.constants';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Returns the set of permissions currently granted to a tenant. */
  async getTenantPermissions(tenantId: string): Promise<VendorPermission[]> {
    const rows = await this.prisma.tenantPermission.findMany({
      where: { tenantId },
      select: { permission: true },
    });
    return rows.map((r) => r.permission);
  }

  /** Quick boolean check used by the guard. */
  async tenantHas(tenantId: string, permission: VendorPermission): Promise<boolean> {
    const row = await this.prisma.tenantPermission.findUnique({
      where: { tenantId_permission: { tenantId, permission } },
      select: { id: true },
    });
    return !!row;
  }

  /** Grant the platform-default permission set to a freshly-created tenant. */
  async grantDefaults(tenantId: string, grantedBy: string) {
    await this.prisma.tenantPermission.createMany({
      data: DEFAULT_VENDOR_PERMISSIONS.map((permission) => ({
        tenantId,
        permission,
        grantedBy,
      })),
      skipDuplicates: true,
    });
  }

  /** Idempotent grant of a single permission. */
  async grant(
    tenantId: string,
    permission: VendorPermission,
    grantedBy: string,
    note?: string,
  ) {
    await this.assertTenantExists(tenantId);
    await this.prisma.tenantPermission.upsert({
      where: { tenantId_permission: { tenantId, permission } },
      create: { tenantId, permission, grantedBy, note },
      update: { grantedBy, grantedAt: new Date(), note },
    });
    await this.audit.log({
      actorId: grantedBy,
      action: 'PERMISSION_GRANTED',
      targetType: 'Tenant',
      targetId: tenantId,
      metadata: { permission, note },
    });
    return this.getTenantPermissions(tenantId);
  }

  /** Idempotent revoke of a single permission. */
  async revoke(tenantId: string, permission: VendorPermission, actorId: string) {
    await this.assertTenantExists(tenantId);
    await this.prisma.tenantPermission.deleteMany({
      where: { tenantId, permission },
    });
    await this.audit.log({
      actorId,
      action: 'PERMISSION_REVOKED',
      targetType: 'Tenant',
      targetId: tenantId,
      metadata: { permission },
    });
    return this.getTenantPermissions(tenantId);
  }

  /** Replace the full permission set for a tenant in one transaction. */
  async setAll(tenantId: string, perms: VendorPermission[], actorId: string) {
    await this.assertTenantExists(tenantId);

    const invalid = perms.filter((p) => !ALL_VENDOR_PERMISSIONS.includes(p));
    if (invalid.length > 0) {
      throw new BadRequestException(`Unknown permission(s): ${invalid.join(', ')}`);
    }

    const existing = await this.getTenantPermissions(tenantId);
    const wanted = new Set(perms);
    const current = new Set(existing);

    const toAdd = perms.filter((p) => !current.has(p));
    const toRemove = existing.filter((p) => !wanted.has(p));

    await this.prisma.$transaction([
      ...(toRemove.length
        ? [
            this.prisma.tenantPermission.deleteMany({
              where: { tenantId, permission: { in: toRemove } },
            }),
          ]
        : []),
      ...(toAdd.length
        ? [
            this.prisma.tenantPermission.createMany({
              data: toAdd.map((permission) => ({ tenantId, permission, grantedBy: actorId })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    await this.audit.log({
      actorId,
      action: 'PERMISSIONS_REPLACED',
      targetType: 'Tenant',
      targetId: tenantId,
      metadata: { added: toAdd, removed: toRemove },
    });

    return this.getTenantPermissions(tenantId);
  }

  /** Reset to the platform default permission set. */
  async resetToDefaults(tenantId: string, actorId: string) {
    return this.setAll(tenantId, DEFAULT_VENDOR_PERMISSIONS, actorId);
  }

  /** Catalog of every permission with its description — used by the admin UI. */
  catalog() {
    return ALL_VENDOR_PERMISSIONS.map((permission) => ({
      permission,
      description: PERMISSION_DESCRIPTIONS[permission],
      isDefault: DEFAULT_VENDOR_PERMISSIONS.includes(permission),
    }));
  }

  private async assertTenantExists(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!t) throw new NotFoundException('Vendor not found');
  }
}
