import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface TradeLedgerOrder {
  id: string;
  createdAt: string;
  status: string;
  currency: string;
  customer: { id: string; email: string } | null;
  paymentRef: string | null;
  invoiceNumber: string | null;
  vendors: Array<{ id: string; slug: string; displayName: string }>;
  money: { gross: number; vat: number; mfg: number; vendor: number; platform: number };
  fulfilmentMix: 'VIBEHUB' | 'VENDOR' | 'BOTH';
  shipments: Array<{ carrier: string; trackingNumber: string; status: string }>;
  returnShipment: { status: string } | null;
  hasReview: boolean;
}

export interface TradeLedgerDetail extends TradeLedgerOrder {
  itemsDetailed: Array<{
    id: string;
    productId?: string;
    productTitle: string;
    productImage: string | null;
    manufacturingUnitName: string | null;
    tenant: { id: string; displayName: string; slug: string };
    qty: number;
    unitPrice: number;
    lineTotal: number;
    fulfilment: 'VIBEHUB_MANAGED' | 'VENDOR_MANAGED';
    vendorPayout: number;
    manufacturingCost: number | null;
    profitSharePct: number | null;
    platformShare: number | null;
    commissionRate: number;
  }>;
  shipments: Array<any>;
  returnShipment: any | null;
  reviews: Array<{ id: string; productId: string; rating: number; comment: string; createdAt: string }>;
  auditEntries: Array<{ id: string; action: string; actorId: string | null; createdAt: string; metadata: any }>;
}

export interface TradeLedgerFilters {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  tenantId?: string;
  status?: string;
  fulfilment?: string;
  hasReview?: string;
  search?: string;
}

interface ApiEnvelope<T> { data: T; message?: string; success?: boolean }

function toQs(filters: TradeLedgerFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function useTradeLedger(filters: TradeLedgerFilters) {
  return useQuery({
    queryKey: ['trade-ledger', filters],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<{ items: TradeLedgerOrder[]; total: number; page: number; limit: number }>>(
        `/admin/trade-ledger${toQs(filters)}`,
      );
      return res.data.data;
    },
  });
}

export function useTradeLedgerDetail(orderId: string | null) {
  return useQuery({
    enabled: !!orderId,
    queryKey: ['trade-ledger', 'detail', orderId],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<TradeLedgerDetail>>(`/admin/trade-ledger/${orderId}`);
      return res.data.data;
    },
  });
}

export function buildExportUrl(filters: TradeLedgerFilters): string {
  // The CSV endpoint is on the API base; we surface the full path so the UI
  // can do a window.location-style download without the SPA router catching it.
  return `/admin/trade-ledger/export.csv${toQs(filters)}`;
}
