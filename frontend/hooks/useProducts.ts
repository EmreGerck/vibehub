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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', productId] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      title?: string;
      description?: string;
      price?: number;
      images?: string[];
      tags?: string[];
      categoryId?: string;
      shippingNote?: string;
      previewVideoUrl?: string;
      attributes?: Record<string, unknown>;
      sizeChart?: Record<string, unknown>;
    }) => {
      const res = await api.patch<ApiResponse<Product>>(`/products/${id}`, body);
      return res.data.data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useArchiveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<ApiResponse<Product>>(`/products/${id}/archive`);
      return res.data.data;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variantId,
      ...body
    }: {
      variantId: string;
      priceOverride?: number;
      stockQty?: number;
      lowStockThreshold?: number;
    }) => {
      const res = await api.patch<ApiResponse<ProductVariant>>(`/products/variants/${variantId}`, body);
      return res.data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['product', data.productId] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ variantId, productId: _productId }: { variantId: string; productId: string }) => {
      const res = await api.delete<ApiResponse<null>>(`/products/variants/${variantId}`);
      return res.data.data;
    },
    onSuccess: (_data, { productId }) => {
      qc.invalidateQueries({ queryKey: ['product', productId] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variantId,
      delta,
    }: {
      variantId: string;
      delta: number;
    }) => {
      const res = await api.patch<ApiResponse<ProductVariant>>(
        `/products/variants/${variantId}/stock`,
        { delta },
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['product', data.productId] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async ({
      file,
      folder = 'products',
    }: {
      file: File;
      folder?: 'products' | 'avatars' | 'banners' | 'media' | 'general';
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<ApiResponse<{ url: string; path: string; size: number; mimetype: string }>>(
        `/upload/image?folder=${folder}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data.data;
    },
  });
}
