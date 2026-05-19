'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { useAuthStore } from '../../../../store/auth.store';
import { useI18n } from '../../../../lib/i18n';
import { formatPrice } from '../../../../lib/format';
import type { ApiResponse } from '../../../../types';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function VendorOverviewPage() {
  const t = useI18n((s) => s.t);
  const { user } = useAuthStore();

  const { data: products } = useQuery({
    queryKey: ['vendor-products-overview', user?.tenantId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ items: any[]; total: number }>>('/products', {
        params: { tenantId: user?.tenantId, limit: 100 },
      });
      return res.data.data;
    },
    enabled: !!user?.tenantId,
  });

  const { data: orders } = useQuery({
    queryKey: ['vendor-orders-overview', user?.tenantId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ items: any[]; total: number }>>('/orders/vendor', {
        params: { limit: 100 },
      });
      return res.data.data;
    },
    enabled: !!user?.tenantId,
  });

  const productItems = products?.items ?? [];
  const orderItems = orders?.items ?? [];

  const activeProducts = productItems.filter((p: any) => p.status === 'LIVE').length;
  const draftProducts = productItems.filter((p: any) => p.status === 'DRAFT').length;
  const pendingProducts = productItems.filter((p: any) => p.status === 'PENDING_REVIEW').length;
  const pendingOrders = orderItems.filter((o: any) => o.status === 'PLACED').length;
  const totalRevenue = orderItems.reduce((sum: number, o: any) => sum + Number(o.totalAmount ?? 0), 0);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t('vendor.overview')}</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">{t('vendor.storeAtGlance')}</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard label={t('vendor.totalOrders')} value={orders?.total ?? 0} />
        <StatCard label={t('vendor.pendingOrders')} value={pendingOrders} sub={t('vendor.awaitingConfirmation')} />
        <StatCard label={t('vendor.revenue')} value={formatPrice(totalRevenue)} sub={t('vendor.allTimeGross')} />
        <StatCard label={t('vendor.liveProducts')} value={activeProducts} />
        <StatCard label={t('vendor.drafts')} value={draftProducts} />
        <StatCard label={t('vendor.pendingReview')} value={pendingProducts} sub={t('vendor.awaitingAdmin')} />
      </div>

      <div className="card overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('vendor.recentOrders')}</h2>
        </div>
        {orderItems.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">{t('vendor.noOrders')}</p>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-5 py-3">{t('vendor.orderId')}</th>
                <th className="text-left px-5 py-3">{t('admin.status')}</th>
                <th className="text-left px-5 py-3">{t('vendor.amount')}</th>
                <th className="text-left px-5 py-3">{t('admin.date')}</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.slice(0, 10).map((order: any) => (
                <tr key={order.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{order.id.slice(0, 8)}…</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-900 dark:text-white">{formatPrice(order.totalAmount)}</td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'badge-yellow',
  CONFIRMED: 'badge-blue',
  SHIPPED: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full font-medium',
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
