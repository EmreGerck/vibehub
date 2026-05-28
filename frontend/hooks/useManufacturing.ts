import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface ManufacturingUnit {
  id: string;
  name: string;
  unitCostTRY: string;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

interface ApiEnvelope<T> { data: T; message?: string; success?: boolean }

const KEY = ['admin', 'manufacturing-units'];

export function useManufacturingUnits(includeInactive = false) {
  return useQuery<ManufacturingUnit[]>({
    queryKey: [...KEY, { includeInactive }],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<ManufacturingUnit[]>>(
        `/admin/manufacturing-units${includeInactive ? '?includeInactive=true' : ''}`,
      );
      return res.data.data;
    },
  });
}

export function useCreateManufacturingUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; unitCostTRY: number; notes?: string; active?: boolean }) => {
      const res = await api.post<ApiEnvelope<ManufacturingUnit>>('/admin/manufacturing-units', body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateManufacturingUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { id: string; name?: string; unitCostTRY?: number; notes?: string | null; active?: boolean }) => {
      const { id, ...rest } = body;
      const res = await api.patch<ApiEnvelope<ManufacturingUnit>>(`/admin/manufacturing-units/${id}`, rest);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteManufacturingUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<ApiEnvelope<{ deleted: boolean }>>(`/admin/manufacturing-units/${id}`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
