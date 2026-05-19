import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse, VendorMedia, MediaType } from '../types';

export function useVendorMedia(tenantId?: string) {
  return useQuery({
    queryKey: ['vendor-media', tenantId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<VendorMedia[]>>(`/media/${tenantId}`);
      return res.data.data;
    },
    enabled: !!tenantId,
  });
}

export function useMyMedia() {
  return useQuery({
    queryKey: ['my-media'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<VendorMedia[]>>('/media/mine/list');
      return res.data.data;
    },
  });
}

export function useCreateMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { type: MediaType; url: string; title?: string; sortOrder?: number }) => {
      const res = await api.post<ApiResponse<VendorMedia>>('/media', body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-media'] });
      qc.invalidateQueries({ queryKey: ['vendor-media'] });
    },
  });
}

export function useUpdateMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; type?: MediaType; url?: string; title?: string; sortOrder?: number; active?: boolean }) => {
      const res = await api.patch<ApiResponse<VendorMedia>>(`/media/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-media'] });
      qc.invalidateQueries({ queryKey: ['vendor-media'] });
    },
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/media/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-media'] });
      qc.invalidateQueries({ queryKey: ['vendor-media'] });
    },
  });
}

// Admin variants
export function useAdminVendorMedia(tenantId?: string) {
  return useQuery({
    queryKey: ['admin-media', tenantId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<VendorMedia[]>>(`/admin/media/${tenantId}`);
      return res.data.data;
    },
    enabled: !!tenantId,
  });
}

export function useAdminCreateMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, ...body }: { tenantId: string; type: MediaType; url: string; title?: string }) => {
      const res = await api.post<ApiResponse<VendorMedia>>(`/admin/media/${tenantId}`, body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-media'] }),
  });
}

export function useAdminUpdateMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [k: string]: any }) => {
      const res = await api.patch<ApiResponse<VendorMedia>>(`/admin/media/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-media'] }),
  });
}

export function useAdminDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/media/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-media'] }),
  });
}
