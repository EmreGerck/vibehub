'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse } from '../types';

export interface CategorySchemaField {
  key: string;
  label: { tr: string; en: string };
  type: 'text' | 'select' | 'boolean';
  options?: string[];
  required?: boolean;
}

export interface CategoryAttributeSchema {
  fields: CategorySchemaField[];
}

export interface CategorySizeChart {
  unit?: string;
  measurements?: Array<{ key: string; label: { tr: string; en: string } }>;
  sizes?: Array<Record<string, string | number>>;
}

export interface Category {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  icon?: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  attributeSchema?: CategoryAttributeSchema | null;
  sizeChartTemplate?: CategorySizeChart | null;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Category[]>>('/categories');
      return res.data.data ?? [];
    },
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Category[]>>('/admin/categories');
      return res.data.data ?? [];
    },
  });
}

export function useAdminCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Omit<Category, 'id' | 'createdAt'>) => {
      const res = await api.post<ApiResponse<Category>>('/admin/categories', body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });
}

export function useAdminUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Category> & { id: string }) => {
      const res = await api.patch<ApiResponse<Category>>(`/admin/categories/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });
}

export function useAdminDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<ApiResponse<Category>>(`/admin/categories/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });
}
