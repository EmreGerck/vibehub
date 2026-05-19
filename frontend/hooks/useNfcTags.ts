import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse, PaginatedResponse, NfcTag } from '../types';

interface NfcTagsQuery {
  page?: number;
  limit?: number;
  search?: string;
  enabled?: boolean;
}

export function useNfcTags(params?: NfcTagsQuery) {
  return useQuery({
    queryKey: ['nfc-tags', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaginatedResponse<NfcTag>>>('/nfc/tags', { params });
      return res.data.data;
    },
  });
}

export function useNfcTag(id: string) {
  return useQuery({
    queryKey: ['nfc-tag', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<NfcTag>>(`/nfc/tags/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateNfcTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; destinationUrl: string; staticUrl?: string; tenantId?: string }) => {
      const res = await api.post<ApiResponse<NfcTag>>('/nfc/tags', body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nfc-tags'] }),
  });
}

export function useUpdateNfcTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; destinationUrl?: string; staticUrl?: string; enabled?: boolean }) => {
      const res = await api.patch<ApiResponse<NfcTag>>(`/nfc/tags/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nfc-tags'] }),
  });
}

export function useDeleteNfcTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/nfc/tags/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nfc-tags'] }),
  });
}

export function useResetNfcScanCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<ApiResponse<NfcTag>>(`/nfc/tags/${id}/reset-count`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nfc-tags'] }),
  });
}

export function useBulkUpdateNfcDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { tenantId: string; destinationUrl: string }) => {
      const res = await api.post<ApiResponse<{ updated: number }>>('/nfc/tags/bulk-update', body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nfc-tags'] }),
  });
}
