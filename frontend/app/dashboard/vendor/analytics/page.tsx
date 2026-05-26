'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { useAuthStore } from '../../../../store/auth.store';
import { formatPrice } from '../../../../lib/format';
import { useFollowStatus } from '../../../../hooks/useVendors';
import { useI18n } from '../../../../lib/i18n';
import type { ApiResponse, ProductStatus } from '../../../../types';

function StatCard({
  label,
  value,
  sub,
  color = 'text-gray-900 dark:text-white',
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
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
  PLACED: 'badge-yellow',
  CONFIRMED: 'badge-blue',
  SHIPPED:
    'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full font-medium',
  DELIVERED: 'badge-green',
  CANCELLED: 'badge-red',
  REFUNDED: 'badge-gray',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? 'badge-gray'}`}>
      {status}
    </span>
  );
}

export default function VendorAnalyticsPage() {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;
  const t = useI18n((s) => s.t);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['vendor-analytics-products', tenantId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ items: Array<{ id: string; status: ProductStatus }>; total: number }>>(
        '/products',
        { params: { tenantId, limit: 200 } },
      );
      return res.data.data;
    },
    enabled: !!tenantId,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['vendor-analytics-orders', tenantId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ items: any[]; total: number }>>('/orders/vendor', {
        params: { limit: 200 },
      });
      return res.data.data;
    },
    enabled: !!tenantId,
  });

  // Follower count via follow-status endpoint (uses the tenantId as vendorId)
  const { data: followData, isLoading: followLoading } = useFollowStatus(tenantId ?? undefined, !!tenantId);

  const isLoading = productsLoading || ordersLoading || followLoading;

  const productItems = products?.items ?? [];
  const orderItems: any[] = orders?.items ?? [];

  const liveCount = productItems.filter((p) => p.status === 'LIVE').length;
  const draftCount = productItems.filter((p) => p.status === 'DRAFT').length;
  const pendingCount = productItems.filter((p) => p.status === 'PENDING_REVIEW').length;

  const totalRevenue = orderItems.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
  const totalOrders = orders?.total ?? 0;
  const recentOrders = orderItems.slice(0, 10);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-64">
        <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t('vendor.analytics.title')}</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">{t('vendor.analytics.subtitle')}</p>

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard
          label={t('vendor.totalOrders')}
          value={totalOrders.toLocaleString()}
          color="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          label={t('vendor.revenue')}
          value={formatPrice(totalRevenue)}
          sub={t('vendor.allTimeGross')}
          color="text-green-600 dark:text-green-400"
        />
        <StatCard
          label={t('store.followers')}
          value={(followData?.followerCount ?? 0).toLocaleString()}
        />
        <StatCard
          label={t('vendor.liveProducts')}
          value={liveCount}
          color="text-green-600 dark:text-green-400"
        />
        <StatCard
          label={t('vendor.drafts')}
          value={draftCount}
        />
        <StatCard
          label={t('vendor.pendingReview')}
          value={pendingCount}
          sub={t('vendor.awaitingAdmin')}
          color="text-yellow-600 dark:text-yellow-400"
        />
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
                <tr
                  key={order.id}
                  className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                >
                  <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">
                    {formatPrice(order.totalAmount)}
                  </td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                    {order.items?.length ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
