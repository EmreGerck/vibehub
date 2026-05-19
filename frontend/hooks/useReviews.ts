'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse } from '../types';

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: { id: string; email: string; name: string | null };
}

interface ReviewsResult {
  items: Review[];
  total: number;
  page: number;
  limit: number;
}

interface ReviewStats {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

export function useReviews(productId: string, page = 1) {
  return useQuery({
    queryKey: ['reviews', productId, page],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ReviewsResult>>('/reviews', {
        params: { productId, page, limit: 10 },
      });
      return res.data.data;
    },
    enabled: !!productId,
  });
}

export function useReviewStats(productId: string) {
  return useQuery({
    queryKey: ['review-stats', productId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ReviewStats>>('/reviews/stats', {
        params: { productId },
      });
      return res.data.data;
    },
    enabled: !!productId,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { productId: string; rating: number; comment?: string }) => {
      const res = await api.post<ApiResponse<Review>>('/reviews', body);
      return res.data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['reviews', data.productId] });
      qc.invalidateQueries({ queryKey: ['review-stats', data.productId] });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      await api.delete(`/reviews/${reviewId}`);
      return reviewId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['review-stats'] });
    },
  });
}
