'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse, Tenant, Payout } from '../types';

// ── Platform overview ─────────────────────────────────────────────────────────

export interface PlatformOverview {
  orders: { total: number; last30Days: number };
  gmv: { total: number; last30Days: number };
  vendors: { active: number; pending: number };
  customers: number;
  products: number;
  totalReviews: number;
  recentAuditEvents: {
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    actorEmail: string;
    createdAt: string;
  }[];
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PlatformOverview>>('/admin/overview');
      return res.data.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// ── Vendors ───────────────────────────────────────────────────────────────────

interface VendorsResult { items: Tenant[]; total: number; page: number; limit: number; }

export function useAdminVendors(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin-vendors', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<VendorsResult>>('/admin/vendors', { params });
      return res.data.data;
    },
  });
}

export function useAdminCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      slug: string;
      displayName: string;
      artistType: string;
      status?: string;
      commissionRate?: number;
      bio?: string;
      logoUrl?: string;
      bannerUrl?: string;
      ownerEmail?: string;
      ownerPassword?: string;
    }) => {
      const res = await api.post<ApiResponse<Tenant>>('/admin/vendors', body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vendors'] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function usePatchVendorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const res = await api.patch<ApiResponse<Tenant>>(`/admin/vendors/${id}/status`, { status, reason });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-vendors'] }),
  });
}

export function usePatchCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, commissionRate }: { id: string; commissionRate: number }) => {
      const res = await api.patch<ApiResponse<Tenant>>(`/admin/vendors/${id}/commission`, { commissionRate });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-vendors'] }),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, force }: { id: string; force?: boolean }) => {
      const res = await api.delete<ApiResponse<{ id: string; slug: string; displayName: string; deleted: boolean }>>(
        `/admin/vendors/${id}${force ? '?force=true' : ''}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vendors'] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });
}

// ── Per-vendor feature toggles + forum sub-settings (god-user) ────────────────

export interface VendorFeatures {
  forumEnabled: boolean;
  mediaEnabled: boolean;
  eventsEnabled: boolean;
  nfcEnabled: boolean;
}

export interface ForumSettings {
  id: string;
  tenantId: string;
  enabled: boolean;
  requireApproval: boolean;
  allowGuestView: boolean;
  moderationMode: 'OPEN' | 'PRE_MODERATED' | 'LOCKED';
  allowAnonymous: boolean;
  minPostLength: number;
  maxPostLength: number;
  allowImages: boolean;
  allowLinks: boolean;
  allowMentions: boolean;
  allowReactions: boolean;
  allowReplies: boolean;
  slowModeSeconds: number;
  visibility: 'PUBLIC' | 'MEMBERS_ONLY' | 'FOLLOWERS_ONLY';
  postingPolicy: 'EVERYONE' | 'VERIFIED_ONLY' | 'FOLLOWERS_ONLY';
  bannedKeywords: string[];
  autoArchiveDays: number;
  welcomeMessage: string | null;
  rulesText: string | null;
}

export function usePatchVendorFeatures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, features }: { id: string; features: Partial<VendorFeatures> }) => {
      const res = await api.patch<ApiResponse<Tenant & VendorFeatures>>(
        `/admin/vendors/${id}/features`,
        features,
      );
      return res.data.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-vendors'] });
      qc.invalidateQueries({ queryKey: ['vendor', vars.id] });
      qc.invalidateQueries({ queryKey: ['vendor-by-slug'] });
    },
  });
}

export function useVendorForumSettings(vendorId: string | null) {
  return useQuery({
    queryKey: ['vendor-forum-settings', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const res = await api.get<ApiResponse<ForumSettings>>(
        `/admin/vendors/${vendorId}/forum-settings`,
      );
      return res.data.data;
    },
  });
}

export function usePatchVendorForumSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, settings }: { id: string; settings: Partial<ForumSettings> }) => {
      const res = await api.patch<ApiResponse<ForumSettings>>(
        `/admin/vendors/${id}/forum-settings`,
        settings,
      );
      return res.data.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['vendor-forum-settings', vars.id] });
    },
  });
}

// ── Pre-orders ────────────────────────────────────────────────────────────────

export type PreOrderStatus =
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'PRODUCTION'
  | 'SHIPPED'
  | 'CANCELLED';

export interface PreOrderItem {
  id: string;
  orderId: string;
  tenantId: string;
  qty: number;
  isPreOrder: boolean;
  preOrderStatus: PreOrderStatus;
  preOrderShipDate: string | null;
  createdAt: string;
  order: {
    id: string;
    createdAt: string;
    shippingAddress: any;
    customer: { id: string; email: string };
  };
  tenant: { id: string; slug: string; displayName: string };
  variant: {
    id: string;
    sku: string;
    attributes: any;
    product: {
      id: string;
      title: string;
      images: string[];
      isPreOrder: boolean;
      preOrderShipDate: string | null;
      preOrderEndsAt: string | null;
      preOrderLimit: number | null;
    };
  };
}

export function useAdminPreOrders(params?: { status?: PreOrderStatus; tenantId?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin-pre-orders', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ items: PreOrderItem[]; total: number; page: number; limit: number }>>(
        '/admin/pre-orders',
        { params },
      );
      return res.data.data;
    },
  });
}

export function usePatchPreOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, status, note }: { itemId: string; status: PreOrderStatus; note?: string }) => {
      const res = await api.patch<ApiResponse<PreOrderItem>>(`/admin/pre-orders/${itemId}/status`, { status, note });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pre-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

// ── Products ──────────────────────────────────────────────────────────────────

export function useAdminPendingProducts(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin-pending-products', params],
    queryFn: async () => {
      const res = await api.get('/admin/products/pending', { params });
      return res.data.data;
    },
  });
}

export function useAdminAllProducts(params?: { page?: number; limit?: number; search?: string; tenantId?: string }) {
  return useQuery({
    queryKey: ['admin-all-products', params],
    queryFn: async () => {
      const res = await api.get('/admin/products', { params });
      return res.data.data as { items: any[]; total: number; page: number; limit: number };
    },
  });
}

export function useAdminCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      tenantId: string;
      title: string;
      description: string;
      price: number;
      currency?: string;
      images?: string[];
      tags?: string[];
      translations?: Record<string, any>;
      previewVideoUrl?: string;
      categoryId?: string;
    }) => {
      const res = await api.post('/admin/products', body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-all-products'] }),
  });
}

export function useAdminUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title?: string; description?: string; price?: number; currency?: string; images?: string[]; tags?: string[]; translations?: Record<string, any>; previewVideoUrl?: string; categoryId?: string; imageSettings?: Record<string, { x: number; y: number }> }) => {
      const res = await api.patch(`/admin/products/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-all-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useAdminSetProductDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, compareAtPrice }: { id: string; compareAtPrice: number | null }) => {
      const res = await api.patch(`/admin/products/${id}/discount`, { compareAtPrice });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-all-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useAdminSetProductPreOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: {
      id: string;
      preOrderEndsAt: string | null;
      preOrderShipDate?: string | null;
      preOrderLimit?: number | null;
    }) => {
      const res = await api.patch(`/admin/products/${id}/preorder`, body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-all-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useAdminPublishProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/admin/products/${id}/publish`);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-all-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useAdminUnpublishProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/admin/products/${id}/unpublish`);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-all-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useAdminDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/products/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-all-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ── Financials ────────────────────────────────────────────────────────────────

interface FinancialSummary {
  gmv: number;
  totalOrders: number;
  activeVendors: number;
  platformFees: number;
  pendingPayouts: { count: number; netAmount: number; platformFee: number };
  averageOrderValue: number;
}

export function useFinancials() {
  return useQuery({
    queryKey: ['admin-financials'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<FinancialSummary>>('/admin/financials');
      return res.data.data;
    },
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export function useAdminUsers(role?: string) {
  return useQuery({
    queryKey: ['admin-users', role],
    queryFn: async () => {
      const res = await api.get('/admin/users', { params: role ? { role } : undefined });
      return res.data.data as any[];
    },
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; password: string; role: string }) => {
      const res = await api.post('/admin/users', body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export function useAuditLog(params?: { page?: number; limit?: number; action?: string; targetType?: string; fromDate?: string; toDate?: string }) {
  return useQuery({
    queryKey: ['audit-log', params],
    queryFn: async () => {
      const res = await api.get('/admin/audit-log', { params });
      return res.data.data as { items: any[]; total: number; page: number; limit: number };
    },
  });
}

// ── Platform Settings ─────────────────────────────────────────────────────────

export interface PlatformSettings {
  id: string;
  updatedAt: string;

  // Platform Identity
  platformName: string;
  platformTagline: string;
  supportEmail: string;
  supportPhone?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor: string;
  darkModeDefault: boolean;

  // Commerce
  defaultCommissionRate: number;
  currency: string;
  taxRate: number;
  minProductPrice: number;
  maxProductPrice?: number | null;
  freeShippingThreshold?: number | null;
  allowGuestCheckout: boolean;
  minPayoutAmount: number;
  payoutSchedule: string;

  // Vendor Controls
  vendorSignupsOpen: boolean;
  autoApproveVendors: boolean;
  maxProductsPerVendor: number;
  productSubmissionsOpen: boolean;
  autoApproveProducts: boolean;

  // Content & Reviews
  globalForumEnabled: boolean;
  requirePurchaseReview: boolean;
  autoApproveReviews: boolean;
  maxImagesPerProduct: number;
  maxReviewLength: number;
  allowVideoUploads: boolean;

  // Security
  maxLoginAttempts: number;
  sessionDurationHours: number;
  requireEmailVerification: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;

  // Notifications
  orderNotificationEmail?: string | null;
  lowStockThreshold: number;
  notifyVendorOnSale: boolean;
  notifyAdminOnVendorApply: boolean;

  // SEO & Marketing
  metaTitle: string;
  metaDescription: string;
  ogImageUrl?: string | null;
  twitterHandle?: string | null;
  facebookPixelId?: string | null;
  googleTagManagerId?: string | null;
  robotsTxt?: string | null;
  schemaOrgJson?: string | null;
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PlatformSettings>>('/admin/settings');
      return res.data.data;
    },
  });
}

export function useUpdatePlatformSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<PlatformSettings>) => {
      const res = await api.patch<ApiResponse<PlatformSettings>>('/admin/settings', body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-settings'] }),
  });
}

// ── Payouts ───────────────────────────────────────────────────────────────────

/** Vendor view: the caller's own payouts. */
export function useMyPayouts(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['my-payouts', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ items: Payout[]; total: number; page: number; limit: number }>>(
        '/payouts/mine',
        { params },
      );
      return res.data.data;
    },
  });
}

/** Backwards-compatible alias used by the existing vendor payouts page. */
export const usePayouts = useMyPayouts;

/** Admin view: all payouts. */
export function useAdminPayouts(params?: {
  page?: number;
  limit?: number;
  tenantId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['admin-payouts', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ items: Payout[]; total: number; page: number; limit: number }>>(
        '/payouts',
        { params },
      );
      return res.data.data;
    },
  });
}

export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      tenantId: string;
      periodStart: string;
      periodEnd: string;
      grossAmount?: number;
      platformFee?: number;
      netAmount?: number;
    }) => {
      const res = await api.post('/payouts', body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payouts'] }),
  });
}

export function useUpdatePayoutStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const res = await api.patch(`/payouts/${id}/status`, { status, reason });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payouts'] }),
  });
}

export function useDeletePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payouts/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payouts'] }),
  });
}

// ── Admin: variant CRUD ──────────────────────────────────────────────────────

export function useAdminCreateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      ...body
    }: {
      productId: string;
      sku: string;
      attributes: Record<string, string>;
      priceOverride?: number | null;
      stockQty: number;
      lowStockThreshold?: number;
    }) => {
      const res = await api.post(`/admin/products/${productId}/variants`, body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-all-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useAdminUpdateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variantId,
      ...body
    }: {
      variantId: string;
      sku?: string;
      attributes?: Record<string, string>;
      priceOverride?: number | null;
      stockQty?: number;
      lowStockThreshold?: number;
    }) => {
      const res = await api.patch(`/admin/variants/${variantId}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-all-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useAdminDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: string) => {
      await api.delete(`/admin/variants/${variantId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-all-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ── Admin: user edit / delete / password reset ───────────────────────────────

export function useAdminUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      email?: string;
      name?: string;
      phone?: string;
      avatarUrl?: string;
      role?: string;
      tenantId?: string | null;
    }) => {
      const res = await api.patch(`/admin/users/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useAdminResetUserPassword() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await api.post(`/admin/users/${id}/password-reset`, { password });
      return res.data.data;
    },
  });
}

export function useAdminDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

// ── Admin: tenant deep-edit ──────────────────────────────────────────────────

export function useAdminUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      slug?: string;
      displayName?: string;
      artistType?: string;
      status?: string;
      commissionRate?: number;
      bio?: string;
      logoUrl?: string;
      bannerUrl?: string;
    }) => {
      const res = await api.patch(`/admin/vendors/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vendors'] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

// ── Admin: order cancel / refund ─────────────────────────────────────────────

export function useAdminCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      restock,
    }: {
      id: string;
      reason?: string;
      restock?: boolean;
    }) => {
      const res = await api.patch(`/admin/orders/${id}/cancel`, { reason, restock });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });
}

export function useAdminRefundOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      amount,
      restock,
    }: {
      id: string;
      reason?: string;
      amount?: number;
      restock?: boolean;
    }) => {
      const res = await api.patch(`/admin/orders/${id}/refund`, { reason, amount, restock });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });
}

// ── Admin: review moderation ─────────────────────────────────────────────────

export function useAdminReviews(params?: {
  page?: number;
  limit?: number;
  productId?: string;
  customerId?: string;
  minRating?: number;
  maxRating?: number;
}) {
  return useQuery({
    queryKey: ['admin-reviews', params],
    queryFn: async () => {
      const res = await api.get('/admin/reviews', { params });
      return res.data.data as { items: any[]; total: number; page: number; limit: number };
    },
  });
}

export function useAdminUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      rating?: number;
      comment?: string;
    }) => {
      const res = await api.patch(`/admin/reviews/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });
}

export function useAdminDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/reviews/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/overview');
      return res.data.data as {
        totalUsers: number; newUsersThisMonth: number;
        totalOrders: number; ordersThisMonth: number;
        revenueThisMonth: number; revenueAllTime: number;
        activeVendors: number; totalProducts: number;
        purchasers: number; browsers: number;
        reviewCount: number; conversionRate: number;
      };
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useRevenueTrend(days = 30) {
  return useQuery({
    queryKey: ['analytics-revenue', days],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/revenue-trend', { params: { days } });
      return res.data.data as Array<{ date: string; revenue: number }>;
    },
  });
}

export function useUserGrowth(weeks = 12) {
  return useQuery({
    queryKey: ['analytics-user-growth', weeks],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/user-growth', { params: { weeks } });
      return res.data.data as Array<{ week: string; count: number }>;
    },
  });
}

export function useTopProducts() {
  return useQuery({
    queryKey: ['analytics-top-products'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/top-products');
      return res.data.data as Array<{ variantId: string; qty: number; productTitle: string; vendorName: string }>;
    },
  });
}

export function useCustomerSegments() {
  return useQuery({
    queryKey: ['analytics-segments'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/customer-segments');
      return res.data.data as Array<{ segment: string; count: number; description: string; color: string }>;
    },
  });
}

export function useOrderStatusBreakdown() {
  return useQuery({
    queryKey: ['analytics-order-status'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/order-status');
      return res.data.data as Array<{ status: string; count: number }>;
    },
  });
}

export function useRoleBreakdown() {
  return useQuery({
    queryKey: ['analytics-roles'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/role-breakdown');
      return res.data.data as Array<{ role: string; count: number }>;
    },
  });
}

// ── Security Monitoring ───────────────────────────────────────────────────────

export interface SecurityEvent {
  id: string;
  action: string;
  targetType: string;
  /** Nullable — system events (HONEYPOT_HIT, TRAP_ROUTE_HIT, anonymous LOGIN_FAILED) have no target. */
  targetId: string | null;
  /** Nullable when actor is system / no logged-in user. */
  actorEmail: string | null;
  actorRole: string;
  metadata: Record<string, any>;
  createdAt: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface SecurityOverview {
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  summary: {
    failedLogins1h: number;
    failedLogins24h: number;
    accountLocks24h: number;
    passwordResets24h: number;
    suspiciousActions24h: number;
    totalUsersLocked: number;
    newUsers24h: number;
    bruteForceTargets: { targetId: string; attempts: number }[];
  };
  systemHealth: Record<string, { ok: boolean; latencyMs?: number; detail?: string }>;
  recentEvents: SecurityEvent[];
  generatedAt: string;
}

export function useSecurityOverview() {
  return useQuery({
    queryKey: ['security-overview'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SecurityOverview>>('/admin/security/overview');
      return res.data.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // auto-refresh every 30s
  });
}

export function useSecurityEvents(params?: {
  page?: number;
  limit?: number;
  action?: string;
  fromDate?: string;
  toDate?: string;
}) {
  return useQuery({
    queryKey: ['security-events', params],
    queryFn: async () => {
      const res = await api.get('/admin/security/events', { params });
      return res.data.data as {
        data: SecurityEvent[];
        total: number;
        page: number;
        pages: number;
      };
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}
