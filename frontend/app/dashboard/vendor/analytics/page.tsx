'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { api } from '../../../../lib/api';
import { useAuthStore } from '../../../../store/auth.store';
import { formatPrice } from '../../../../lib/format';
import { useFollowStatus } from '../../../../hooks/useVendors';
import { useCan } from '../../../../hooks/usePermissions';
import { useI18n } from '../../../../lib/i18n';
import { PermissionDenied } from '../../../../components/shared/PermissionDenied';
import type { ApiResponse, ProductStatus } from '../../../../types';

// ── Helpers ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'text-gray-900 dark:text-white' }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PLACED:    'badge-yellow',
  CONFIRMED: 'badge-blue',
  SHIPPED:   'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full font-medium',
  DELIVERED: 'badge-green',
  CANCELLED: 'badge-red',
  REFUNDED:  'badge-gray',
};
function StatusBadge({ status }: { status: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? 'badge-gray'}`}>{status}</span>;
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-card, #18181b)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  fontSize: 12,
};

// ── Revenue trend builder (last 30 days from order data) ────────────────────
function buildRevenueTrend(orders: any[]): { date: string; revenue: number }[] {
  const days = 30;
  const map = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of orders) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + Number(o.totalAmount ?? 0));
  }
  return Array.from(map.entries()).map(([date, revenue]) => ({
    date: new Date(date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
    revenue,
  }));
}

// ── Top products builder ─────────────────────────────────────────────────────
function buildTopProducts(orders: any[]): { title: string; revenue: number; count: number }[] {
  const map = new Map<string, { title: string; revenue: number; count: number }>();
  for (const o of orders) {
    for (const item of (o.items ?? [])) {
      const title = item.variant?.product?.title ?? item.product?.title ?? 'Bilinmeyen';
      const rev = Number(item.unitPrice ?? 0) * (item.qty ?? 1);
      const prev = map.get(title) ?? { title, revenue: 0, count: 0 };
      map.set(title, { title, revenue: prev.revenue + rev, count: prev.count + (item.qty ?? 1) });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
}

// ── Status distribution builder ───────────────────────────────────────────────
const STATUS_CHART_COLORS: Record<string, string> = {
  PLACED: '#eab308', CONFIRMED: '#3b82f6', SHIPPED: '#a855f7',
  DELIVERED: '#22c55e', CANCELLED: '#ef4444', REFUNDED: '#6b7280',
};

// ── Main page ────────────────────────────────────────────────────────────────
export default function VendorAnalyticsPage() {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;
  const t = useI18n((s) => s.t);
  const can = useCan();
  const canView = can('ANALYTICS_VIEW');

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['vendor-analytics-products', tenantId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ items: Array<{ id: string; status: ProductStatus }>; total: number }>>(
        '/products', { params: { tenantId, limit: 200 } },
      );
      return res.data.data;
    },
    enabled: !!tenantId && canView,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['vendor-analytics-orders', tenantId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ items: any[]; total: number }>>('/orders/vendor', {
        params: { limit: 500 },
      });
      return res.data.data;
    },
    enabled: !!tenantId && canView,
  });

  const { data: followData, isLoading: followLoading } = useFollowStatus(tenantId ?? undefined, !!tenantId && canView);

  const isLoading = productsLoading || ordersLoading || followLoading;

  const productItems = products?.items ?? [];
  const orderItems: any[] = orders?.items ?? [];

  const liveCount    = productItems.filter((p) => p.status === 'LIVE').length;
  const draftCount   = productItems.filter((p) => p.status === 'DRAFT').length;
  const pendingCount = productItems.filter((p) => p.status === 'PENDING_REVIEW').length;

  const totalRevenue = orderItems.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
  const totalOrders  = orders?.total ?? 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // This month stats
  const thisMonth = useMemo(() => {
    const now = new Date();
    const monthOrders = orderItems.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      count: monthOrders.length,
      revenue: monthOrders.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0),
    };
  }, [orderItems]);

  const revenueTrend   = useMemo(() => buildRevenueTrend(orderItems), [orderItems]);
  const topProducts    = useMemo(() => buildTopProducts(orderItems), [orderItems]);

  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orderItems) map[o.status] = (map[o.status] ?? 0) + 1;
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [orderItems]);

  const recentOrders = orderItems.slice(0, 10);

  if (!canView) {
    return <PermissionDenied requiredPermission="ANALYTICS_VIEW" />;
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-64">
        <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t('vendor.analytics.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('vendor.analytics.subtitle')}</p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('vendor.totalOrders')} value={totalOrders.toLocaleString()} color="text-purple-600 dark:text-purple-400" />
        <StatCard label={t('vendor.revenue')} value={formatPrice(totalRevenue)} sub={t('vendor.allTimeGross')} color="text-green-600 dark:text-green-400" />
        <StatCard label="Bu ay ciro" value={formatPrice(thisMonth.revenue)} sub={`${thisMonth.count} sipariş`} color="text-blue-600 dark:text-blue-400" />
        <StatCard label="Ort. sipariş değeri" value={formatPrice(avgOrderValue)} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label={t('store.followers')} value={(followData?.followerCount ?? 0).toLocaleString()} />
        <StatCard label={t('vendor.liveProducts')} value={liveCount} color="text-green-600 dark:text-green-400" />
        <StatCard label={t('vendor.pendingReview')} value={pendingCount} sub={t('vendor.awaitingAdmin')} color="text-yellow-600 dark:text-yellow-400" />
      </div>

      {/* ── Revenue trend chart ────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Son 30 Gün Ciro</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Günlük satış geliriniz</p>
        {revenueTrend.every((d) => d.revenue === 0) ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Henüz sipariş yok</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueTrend} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₺${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={{ color: '#e5e7eb', fontWeight: 600, marginBottom: 4 }}
                formatter={(v: number) => [formatPrice(v), 'Ciro']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Top products + Status dist ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">En Çok Satan Ürünler</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Gelire göre sıralanmış</p>
          {topProducts.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Henüz sipariş yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₺${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <YAxis type="category" dataKey="title" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatPrice(v), 'Ciro']} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                  {topProducts.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#a855f7' : i === 1 ? '#ec4899' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order status distribution */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Sipariş Durumları</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Tüm siparişlerin dağılımı</p>
          {statusDist.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Henüz sipariş yok</div>
          ) : (
            <div className="space-y-3 pt-2">
              {statusDist.map(({ status, count }) => {
                const pct = Math.round((count / totalOrders) * 100);
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">{status}</span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: STATUS_CHART_COLORS[status] ?? '#6b7280' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent orders table ────────────────────────────────────── */}
      <div className="card overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('vendor.recentOrders')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('vendor.analytics.recentOrdersDesc')}</p>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">{t('vendor.analytics.noOrders')}</p>
        ) : (
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-5 py-3">{t('vendor.orderId')}</th>
                <th className="text-left px-5 py-3">{t('admin.status')}</th>
                <th className="text-left px-5 py-3">{t('vendor.amount')}</th>
                <th className="text-left px-5 py-3">{t('vendor.items')}</th>
                <th className="text-left px-5 py-3">{t('admin.date')}</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order: any) => (
                <tr key={order.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">#{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">{formatPrice(order.totalAmount)}</td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{order.items?.length ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
