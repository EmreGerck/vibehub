'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse, Order } from '../types';

interface OrdersQuery {
  page?: number;
  limit?: number;
  status?: string;
  tenantId?: string;
}

interface OrdersResult {
  items: Order[];
  total: number;
  page: number;
  limit: number;
}

export function useOrders(params?: OrdersQuery) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<OrdersResult>>('/orders/my', { params });
      return res.data.data;
    },
  });
}

export function useVendorOrders(params?: OrdersQuery) {
  return useQuery({
    queryKey: ['vendor-orders', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<OrdersResult>>('/orders/vendor', { params });
      return res.data.data;
    },
  });
}

export function useAdminOrders(params?: OrdersQuery) {
  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<OrdersResult>>('/admin/orders', { params });
      return res.data.data;
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await api.patch<ApiResponse<Order>>(`/orders/vendor/${orderId}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['vendor-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

export function useAdminUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status, reason }: { orderId: string; status: string; reason?: string }) => {
      const res = await api.patch<ApiResponse<Order>>(`/orders/admin/${orderId}/status`, { status, reason });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['vendor-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}
