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

export function useRequestRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const res = await api.patch<ApiResponse<any>>(`/orders/my/${orderId}/request-refund`, { reason });
      return res.data.data;
    },
    onSuccess: (_data, { orderId }) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders', 'my', orderId] });
    },
  });
}

export function useAdminApproveRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note?: string }) => {
      const res = await api.patch<ApiResponse<any>>(`/orders/admin/${orderId}/approve-refund`, { note });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useAdminRejectRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note: string }) => {
      const res = await api.patch<ApiResponse<any>>(`/orders/admin/${orderId}/reject-refund`, { note });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

// ── Kargo (Shipping) hooks ────────────────────────────────────────────────────

export function useTrackShipment(trackingNumber: string, carrier: string) {
  return useQuery({
    queryKey: ['track', trackingNumber, carrier],
    queryFn: async () => {
      const res = await api.get<ApiResponse<any>>(`/kargo/track/${trackingNumber}?carrier=${carrier}`);
      return res.data.data;
    },
    enabled: !!trackingNumber && !!carrier,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
    staleTime:       60 * 1000,
  });
}

export function useOrderReturnShipment(orderId: string, enabled = true) {
  return useQuery({
    queryKey: ['return-shipment', orderId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<any>>(`/kargo/return/${orderId}`);
      return res.data.data;
    },
    enabled: !!orderId && enabled,
  });
}

export function useAdminCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      orderId: string;
      receiverName: string;
      receiverPhone: string;
      receiverAddress: string;
      receiverCity: string;
      receiverDistrict: string;
      weight: number;
      description: string;
      carrier?: 'aras' | 'yurtici';
    }) => {
      const res = await api.post<ApiResponse<any>>('/kargo/shipments', dto);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['vendor-orders'] });
    },
  });
}

/**
 * Vendor-side: same backend route as admin. Backend accepts VENDOR_OWNER/MANAGER
 * and infers tenantId from the order's items.
 */
export const useCreateShipment = useAdminCreateShipment;

export function useAdminConfirmDepotArrival() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note?: string }) => {
      const res = await api.patch<ApiResponse<any>>(`/kargo/return/${orderId}/arrived`, { note });
      return res.data.data;
    },
    onSuccess: (_data, { orderId }) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['return-shipment', orderId] });
    },
  });
}

export function useMockPay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post<ApiResponse<{
        orderId: string;
        paymentRef: string;
        invoiceNumber: string | null;
        invoiceId: string | null;
        mockInvoice: boolean;
      }>>('/payments/mock/pay', { orderId });
      return res.data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['orders', 'my', data.orderId] });
    },
  });
}
