'use client';

/**
 * useProductSearch — Meilisearch instant-search hook
 * ───────────────────────────────────────────────────
 * Debounces the query (300ms), calls GET /products/search,
 * and returns paginated results with timing info.
 *
 * Falls back to Prisma LIKE on the backend when Meilisearch is unavailable —
 * the hook itself is unaware of which engine ran.
 */

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { ApiResponse, Product } from '../types';
import { useI18n } from '../lib/i18n';

export interface SearchParams {
  query: string;
  tenantId?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  items: Product[];
  total: number;
  processingTimeMs?: number;
}

/** Debounce hook — delays updating `value` by `delay` ms after last change. */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Main search hook.
 *
 * @param params - Search parameters. Pass `query: ''` to disable.
 * @param debounceMs - Debounce delay in ms (default 300)
 */
export function useProductSearch(params: SearchParams, debounceMs = 300) {
  const locale = useI18n((s) => s.locale);
  const debouncedQuery = useDebounce(params.query.trim(), debounceMs);

  return useQuery<SearchResult>({
    queryKey: ['product-search', debouncedQuery, params, locale],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SearchResult>>('/products/search', {
        params: {
          q:          debouncedQuery,
          tenantId:   params.tenantId,
          categoryId: params.categoryId,
          minPrice:   params.minPrice,
          maxPrice:   params.maxPrice,
          currency:   params.currency,
          sortBy:     params.sortBy,
          page:       params.page ?? 1,
          limit:      params.limit ?? 20,
          lang:       locale,
        },
      });
      return res.data.data;
    },
    // Only fetch when query has at least 2 chars
    enabled: debouncedQuery.length >= 2,
    // Keep previous data while new query runs (no flash)
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

/**
 * Lightweight hook for the search overlay (shows top 6 results instantly).
 * Used by InstantSearchBar component.
 */
export function useInstantSearch(query: string) {
  return useProductSearch({ query, limit: 6 }, 200);
}
