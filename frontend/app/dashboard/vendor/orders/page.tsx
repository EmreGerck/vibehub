'use client';

import { useState } from 'react';
import { useVendorOrders, useUpdateOrderStatus } from '../../../../hooks/useOrders';
import { useI18n } from '../../../../lib/i18n';
import { formatPrice } from '../../../../lib/format';

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'badge-yellow',
  CONFIRMED: 'badge-blue',
  SHIPPED: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full font-medium',
  DELIVERED: 'badge-green',
  CANCELLED: 'badge-red',
  REFUNDED: 'badge-gray',
};

const NEXT_STATUS: Record<string, string> = {
  PLACED: 'CONFIRMED',
  CONFIRMED: 'SHIPPED',
};

export default function VendorOrdersPage() {
  const t = useI18n((s) => s.t);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useVendorOrders({ page, limit: 20, status: statusFilter || undefined });
  const updateStatus = useUpdateOrderStatus();

  async function advance(orderId: string, current: string) {
    const next = NEXT_STATUS[current];
    if (!next) return;
    try { await updateStatus.mutateAsync({ orderId, status: next }); } catch {}
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('vendor.orders')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{data?.total ?? 0} {t('admin.total')}</p>
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">{t('admin.allStatuses')}</option>
          <option value="PLACED">{t('admin.placed')}</option>
          <option value="CONFIRMED">{t('admin.confirmed')}</option>
          <option value="SHIPPED">{t('admin.shipped')}</option>
          <option value="DELIVERED">{t('admin.delivered')}</option>
          <option value="CANCELLED">{t('admin.cancelled')}</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : data?.items.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">{t('vendor.noOrdersFound')}</p>
      ) : (
        <>
          <div className="card overflow-x-auto mb-4">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3">{t('admin.order')}</th>
                  <th className="text-left px-5 py-3">{t('vendor.items')}</th>
                  <th className="text-left px-5 py-3">{t('cart.total')}</th>
                  <th className="text-left px-5 py-3">{t('admin.status')}</th>
                  <th className="text-left px-5 py-3">{t('admin.date')}</th>
                  <th className="text-left px-5 py-3">{t('vendor.action')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((order: any) => (
                  <tr key={order.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{order.id.slice(0, 8)}…</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{order.items?.length ?? 0}</td>
                    <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">{formatPrice(order.totalAmount)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'badge-gray'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      {order.status === 'PLACED' && (
                        <button
                          onClick={() => advance(order.id, order.status)}
                          disabled={updateStatus.isPending}
                          className="text-xs bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {t('vendor.markConfirmed')}
                        </button>
                      )}
                      {order.status === 'CONFIRMED' && (
                        <button
                          onClick={() => advance(order.id, order.status)}
                          disabled={updateStatus.isPending}
                          className="text-xs bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-800/60 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {t('vendor.markShipped')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 justify-end text-sm">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.prev')}</button>
            <span className="text-gray-500 dark:text-gray-400">{t('admin.page')} {page}</span>
            <button disabled={(data?.items.length ?? 0) < 20} onClick={() => setPage(p => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.next')}</button>
          </div>
        </>
      )}
    </div>
  );
}
