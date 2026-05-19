'use client';

import { useFinancials } from '../../../../hooks/useAdmin';
import { useI18n } from '../../../../lib/i18n';
import { formatPrice } from '../../../../lib/format';

function StatCard({ label, value, sub, color = 'text-gray-900 dark:text-white' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminFinancialsPage() {
  const t = useI18n((s) => s.t);
  const { data, isLoading } = useFinancials();

  if (isLoading) return <div className="p-6 md:p-8 text-gray-400">{t('admin.loading')}</div>;
  if (!data) return <div className="p-6 md:p-8 text-gray-500">{t('admin.noData')}</div>;

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t('admin.financialsTitle')}</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">{t('admin.platformSnapshot')}</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard
          label={t('admin.gmv')}
          value={formatPrice(data.gmv)}
          sub={t('admin.gmvSub')}
          color="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          label={t('admin.platformFees')}
          value={formatPrice(data.platformFees)}
          sub={t('admin.platformFeesSub')}
          color="text-green-600 dark:text-green-400"
        />
        <StatCard
          label={t('admin.avgOrderValue')}
          value={formatPrice(data.averageOrderValue)}
        />
        <StatCard
          label={t('admin.totalOrders')}
          value={data.totalOrders.toLocaleString()}
        />
        <StatCard
          label={t('admin.activeVendors')}
          value={data.activeVendors.toLocaleString()}
        />
        <StatCard
          label={t('admin.pendingPayouts')}
          value={data.pendingPayouts.count.toLocaleString()}
          sub={`${formatPrice(data.pendingPayouts.netAmount)} net · ${formatPrice(data.pendingPayouts.platformFee)} platform`}
          color="text-yellow-600 dark:text-yellow-400"
        />
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{t('admin.pendingPayoutsDetail')}</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">{t('admin.count')}</p>
            <p className="text-gray-900 dark:text-white text-xl font-semibold">{data.pendingPayouts.count}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">{t('admin.netToVendors')}</p>
            <p className="text-yellow-600 dark:text-yellow-300 text-xl font-semibold">{formatPrice(data.pendingPayouts.netAmount)}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">{t('admin.platformPortion')}</p>
            <p className="text-green-600 dark:text-green-300 text-xl font-semibold">{formatPrice(data.pendingPayouts.platformFee)}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('admin.payoutsNote')}</p>
      </div>
    </div>
  );
}
