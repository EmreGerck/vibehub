'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { ApiResponse, Tenant } from '../types';

export function useVendors(params?: { page?: number; limit?: number; search?: string }) {
  const locale = useI18n((s) => s.locale);
  return useQuery({
    queryKey: ['vendors', params, locale],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ items: Tenant[]; total: number }>>('/vendors', {
        params,
      });
      return res.data.data;
    },
  });
}

export function useVendorBySlug(slug: string) {
  return useQuery({
    queryKey: ['vendor', slug],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Tenant>>(`/vendors/slug/${slug}`);
      return res.data.data;
    },
    enabled: !!slug,
  });
}

export function useFollowStatus(vendorId?: string, enabled = true) {
  return useQuery({
    queryKey: ['follow', vendorId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ following: boolean; followerCount: number }>>(`/vendors/${vendorId}/follow`);
      return res.data.data;
    },
    enabled: enabled && !!vendorId,
  });
}

export function useFollowVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vendorId: string) => {
      await api.post(`/vendors/${vendorId}/follow`);
    },
    onSuccess: (_, vendorId) => {
      qc.invalidateQueries({ queryKey: ['follow', vendorId] });
      qc.invalidateQueries({ queryKey: ['vendor'] });
    },
  });
}

export function useUnfollowVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vendorId: string) => {
      await api.delete(`/vendors/${vendorId}/follow`);
    },
    onSuccess: (_, vendorId) => {
      qc.invalidateQueries({ queryKey: ['follow', vendorId] });
      qc.invalidateQueries({ queryKey: ['vendor'] });
    },
  });
}

export function useApplyVendor() {
  return useMutation({
    mutationFn: async (body: {
      displayName: string;
      slug: string;
      artistType: string;
      bio?: string;
      ownerEmail: string;
      ownerPassword: string;
      defaultFulfilment?: 'VENDOR_MANAGED' | 'VIBEHUB_MANAGED';
      /** Honeypot — must stay empty for real users. */
      website?: string;
    }) => {
      const res = await api.post<ApiResponse<Tenant>>('/vendors/apply', body);
      return res.data.data;
    },
  });
}

export function useMyVendorProfile() {
  return useQuery({
    queryKey: ['my-vendor-profile'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Tenant>>('/vendors/me');
      return res.data.data;
    },
  });
}

export function useUpdateMyVendorProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      displayName?: string;
      bio?: string;
      logoUrl?: string;
      bannerUrl?: string;
      brandColor?: string;
    }) => {
      const res = await api.patch<ApiResponse<Tenant>>('/vendors/me', body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-vendor-profile'] });
      qc.invalidateQueries({ queryKey: ['vendor'] });
    },
  });
}
