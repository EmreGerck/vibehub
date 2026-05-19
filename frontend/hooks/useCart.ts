'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse } from '../types';

export interface CartItemData {
  variantId: string;
  qty: number;
  tenantId: string;
  tenantDisplayName: string;
  lineTotal: number;
  product: { id: string; title: string; images: string[] };
  variant: {
    sku: string;
    attributes: Record<string, string>;
    priceOverride: number | null;
    stockQty: number;
    price: number;
  };
}

interface CartData {
  items: CartItemData[];
  total: number;
  itemCount: number;
}

export function useCart(enabled: boolean = true) {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CartData>>('/cart');
      return res.data.data;
    },
    enabled,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ variantId, qty }: { variantId: string; qty: number }) => {
      const res = await api.post<ApiResponse<CartData>>('/cart/items', { variantId, qty });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ variantId, qty }: { variantId: string; qty: number }) => {
      const res = await api.patch<ApiResponse<CartData>>(`/cart/items/${variantId}`, { qty });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: string) => {
      const res = await api.delete<ApiResponse<CartData>>(`/cart/items/${variantId}`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      shippingAddress: {
        name: string; line1: string; line2?: string; city: string;
        state: string; postalCode: string; country: string; phone?: string;
      };
    }) => {
      const res = await api.post<ApiResponse<any>>('/orders', body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useMyOrders() {
  return useQuery({
    queryKey: ['orders', 'my'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ items: any[]; total: number }>>('/orders/my');
      return res.data.data;
    },
  });
}

export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: ['orders', 'my', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<any>>(`/orders/my/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.patch<ApiResponse<any>>(`/orders/my/${orderId}/cancel`);
      return res.data.data;
    },
    onSuccess: (_data, orderId) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders', 'my', orderId] });
    },
  });
}
