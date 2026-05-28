'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse, Payout } from '../types';

interface PayoutsQuery {
  page?: number;
  limit?: number;
  status?: string;
}

interface PayoutsResult {
  items: Payout[];
  total: number;
  page: number;
  limit: number;
}

/**
 * GET /payouts/mine — vendor lists own payouts.
 * Backend gates with VENDOR_OWNER/VENDOR_MANAGER + PAYOUT_REQUEST perm.
 */
export function usePayoutsMine(params?: PayoutsQuery) {
  return useQuery({
    queryKey: ['payouts-mine', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PayoutsResult>>('/payouts/mine', { params });
      return res.data.data;
    },
  });
}
