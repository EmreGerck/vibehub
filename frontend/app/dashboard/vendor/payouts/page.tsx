'use client';

import { usePayouts } from '../../../../hooks/useAdmin';
import { useI18n } from '../../../../lib/i18n';
import { formatPrice } from '../../../../lib/format';
import type { Payout } from '../../../../types';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-yellow',
  PROCESSING: 'badge-blue',
  PAID: 'badge-green',
  FAILED: 'badge-red',
};

export default function VendorPayoutsPage() {
  const t = useI18n((s) => s.t);
  const { data, isLoading } = usePayouts({ limit: 50 });

  const payouts = data?.items ?? [];
  const totalPaid = payouts.filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.netAmount), 0);
  const totalPending = payouts.filter(p => p.status === 'PENDING').reduce((s, p) => s + Number(p.netAmount), 0);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t('vendor.payoutsTitle')}</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">{t('vendor.payoutsDesc')}</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('vendor.totalPaid')}</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatPrice(totalPaid)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('vendor.pending')}</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{formatPrice(totalPending)}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : payouts.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">{t('vendor.noPayouts')}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-5 py-3">{t('vendor.period')}</th>
                <th className="text-left px-5 py-3">{t('vendor.gross')}</th>
                <th className="text-left px-5 py-3">{t('vendor.platformFee')}</th>
                <th className="text-left px-5 py-3">{t('vendor.net')}</th>
                <th className="text-left px-5 py-3">{t('admin.status')}</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout: Payout) => (
                <tr key={payout.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs">
                    {new Date(payout.periodStart).toLocaleDateString()} –{' '}
                    {new Date(payout.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-gray-900 dark:text-white">{formatPrice(payout.grossAmount)}</td>
                  <td className="px-5 py-3 text-red-600 dark:text-red-400">-{formatPrice(payout.platformFee)}</td>
                  <td className="px-5 py-3 text-green-600 dark:text-green-400 font-semibold">{formatPrice(payout.netAmount)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[payout.status] ?? 'badge-gray'}`}>
                      {payout.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
