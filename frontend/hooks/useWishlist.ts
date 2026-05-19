'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse, Product } from '../types';

interface WishlistResult {
  items: Product[];
  total: number;
}

export function useWishlist(enabled = true) {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<WishlistResult>>('/wishlist');
      return res.data.data;
    },
    enabled,
  });
}

export function useWishlistCheck(productId: string, enabled = true) {
  return useQuery({
    queryKey: ['wishlist-check', productId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ wishlisted: boolean }>>(`/wishlist/check/${productId}`);
      return res.data.data;
    },
    enabled: enabled && !!productId,
  });
}

export function useToggleWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const res = await api.post<ApiResponse<{ added: boolean }>>(`/wishlist/${productId}`);
      return { productId, ...res.data.data };
    },
    onSuccess: (data) => {
      qc.setQueryData(['wishlist-check', data.productId], { wishlisted: data.added });
      qc.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}
