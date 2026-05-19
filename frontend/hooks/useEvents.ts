import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse, VendorEvent, EventProvider } from '../types';

export function useVendorEvents(tenantId?: string) {
  return useQuery({
    queryKey: ['vendor-events', tenantId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<VendorEvent[]>>(`/vendors/${tenantId}/events`);
      return res.data.data;
    },
    enabled: !!tenantId,
  });
}

export function useMyEvents() {
  return useQuery({
    queryKey: ['my-events'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<VendorEvent[]>>('/vendors/me/events');
      return res.data.data;
    },
  });
}

// Admin hooks
interface AdminEventsQuery {
  page?: number;
  limit?: number;
  tenantId?: string;
  provider?: EventProvider;
  fromDate?: string;
  toDate?: string;
}

export function useAdminEvents(params?: AdminEventsQuery) {
  return useQuery({
    queryKey: ['admin-events', params],
    queryFn: async () => {
      const res = await api.get('/admin/events', { params });
      return res.data.data;
    },
  });
}

export function useAdminCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      tenantId: string; title: string; description?: string; href: string;
      provider: EventProvider; date: string; venue?: string; imageUrl?: string;
    }) => {
      const res = await api.post<ApiResponse<VendorEvent>>('/admin/events', body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-events'] }),
  });
}

export function useAdminUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [k: string]: any }) => {
      const res = await api.patch<ApiResponse<VendorEvent>>(`/admin/events/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      qc.invalidateQueries({ queryKey: ['vendor-events'] });
    },
  });
}

export function useAdminDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/events/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-events'] }),
  });
}
