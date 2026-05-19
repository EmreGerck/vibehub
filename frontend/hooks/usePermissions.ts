'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import type { ApiResponse } from '../types';

export type VendorPermission =
  | 'PRODUCT_CREATE'
  | 'PRODUCT_EDIT'
  | 'PRODUCT_DELETE'
  | 'PRODUCT_SUBMIT'
  | 'PRODUCT_PUBLISH_DIRECT'
  | 'VARIANT_MANAGE'
  | 'INVENTORY_EDIT'
  | 'ORDER_VIEW'
  | 'ORDER_FULFILL'
  | 'STOREFRONT_EDIT'
  | 'PAYOUT_REQUEST'
  | 'ANALYTICS_VIEW'
  | 'MANAGER_INVITE'
  | 'FORUM_MANAGE'
  | 'MEDIA_MANAGE';

export interface PermissionCatalogEntry {
  permission: VendorPermission;
  description: string;
  isDefault: boolean;
}

// ── Admin: per-vendor permission management ──────────────────────────────────

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ['permission-catalog'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PermissionCatalogEntry[]>>('/admin/permissions/catalog');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 60, // catalog is static
  });
}

export function useVendorPermissions(tenantId?: string) {
  return useQuery({
    queryKey: ['vendor-permissions', tenantId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ permissions: VendorPermission[] }>>(
        `/admin/vendors/${tenantId}/permissions`,
      );
      return res.data.data.permissions;
    },
    enabled: !!tenantId,
  });
}

export function useGrantPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tenantId,
      permission,
      note,
    }: {
      tenantId: string;
      permission: VendorPermission;
      note?: string;
    }) => {
      const res = await api.post<ApiResponse<{ permissions: VendorPermission[] }>>(
        `/admin/vendors/${tenantId}/permissions/${permission}`,
        { note },
      );
      return res.data.data.permissions;
    },
    onSuccess: (_, { tenantId }) =>
      qc.invalidateQueries({ queryKey: ['vendor-permissions', tenantId] }),
  });
}

export function useRevokePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tenantId,
      permission,
    }: {
      tenantId: string;
      permission: VendorPermission;
    }) => {
      const res = await api.delete<ApiResponse<{ permissions: VendorPermission[] }>>(
        `/admin/vendors/${tenantId}/permissions/${permission}`,
      );
      return res.data.data.permissions;
    },
    onSuccess: (_, { tenantId }) =>
      qc.invalidateQueries({ queryKey: ['vendor-permissions', tenantId] }),
  });
}

export function useSetVendorPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tenantId,
      permissions,
    }: {
      tenantId: string;
      permissions: VendorPermission[];
    }) => {
      const res = await api.patch<ApiResponse<{ permissions: VendorPermission[] }>>(
        `/admin/vendors/${tenantId}/permissions`,
        { permissions },
      );
      return res.data.data.permissions;
    },
    onSuccess: (_, { tenantId }) =>
      qc.invalidateQueries({ queryKey: ['vendor-permissions', tenantId] }),
  });
}

export function useResetVendorPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tenantId: string) => {
      const res = await api.post<ApiResponse<{ permissions: VendorPermission[] }>>(
        `/admin/vendors/${tenantId}/permissions/reset`,
      );
      return res.data.data.permissions;
    },
    onSuccess: (_, tenantId) =>
      qc.invalidateQueries({ queryKey: ['vendor-permissions', tenantId] }),
  });
}

// ── Vendor self: read own granted perms (used to gate dashboard UI) ──────────

export function useMyPermissions() {
  const user = useAuthStore((s) => s.user);
  const isVendor = user?.role === 'VENDOR_OWNER' || user?.role === 'VENDOR_MANAGER';

  return useQuery({
    queryKey: ['my-permissions', user?.id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ permissions: VendorPermission[] }>>(
        '/vendors/me/permissions',
      );
      return res.data.data.permissions;
    },
    enabled: !!user && isVendor,
  });
}

/**
 * Convenience hook: returns a stable callback `can(permission)` that resolves
 * to true for admins (always) or for vendors whose tenant has been granted it.
 */
export function useCan() {
  const user = useAuthStore((s) => s.user);
  const { data: perms } = useMyPermissions();
  const isAdmin = user?.role === 'GOD_USER' || user?.role === 'PLATFORM_ADMIN';

  return (permission: VendorPermission): boolean => {
    if (isAdmin) return true;
    return !!perms?.includes(permission);
  };
}
