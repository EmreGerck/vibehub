'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { ApiResponse, Product, ProductVariant } from '../types';

interface ProductsQuery {
  page?: number;
  limit?: number;
  tenantId?: string;
  search?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  categoryId?: string;
}

interface ProductsResult {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

export function useProducts(params?: ProductsQuery) {
  const locale = useI18n((s) => s.locale);
  return useQuery({
    queryKey: ['products', params, locale],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ProductsResult>>('/products', { params });
      return res.data.data;
    },
  });
}

export function useProduct(id: string) {
  const locale = useI18n((s) => s.locale);
  return useQuery({
    queryKey: ['product', id, locale],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Product>>(`/products/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      title: string;
      description: string;
      price: number;
      currency?: string;
      images?: string[];
      tags?: string[];
      categoryId?: string;
      shippingNote?: string;
    }) => {
      const res = await api.post<ApiResponse<Product>>('/products', body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useSubmitProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const res = await api.patch<ApiResponse<Product>>(`/products/${productId}/submit`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useReviewProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, reason }: { id: string; decision: 'APPROVE' | 'REJECT'; reason?: string }) => {
      const res = await api.patch<ApiResponse<Product>>(`/products/${id}/review`, { decision, reason });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useCreateVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      sku: string;
      attributes: Record<string, string>;
      priceOverride?: number;
      stockQty: number;
      lowStockThreshold?: number;
    }) => {
      const res = await api.post<ApiResponse<ProductVariant>>(`/products/${productId}/variants`, body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product', productId] }),
  });
}
