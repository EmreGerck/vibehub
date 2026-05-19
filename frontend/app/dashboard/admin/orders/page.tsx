'use client';

import { useState } from 'react';
import { useAdminOrders } from '../../../../hooks/useOrders';
import { useAdminCancelOrder, useAdminRefundOrder } from '../../../../hooks/useAdmin';
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

export default function AdminOrdersPage() {
  const t = useI18n((s) => s.t);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ order: any; kind: 'cancel' | 'refund' } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionRestock, setActionRestock] = useState(true);
  const [actionAmount, setActionAmount] = useState('');
  const [actionError, setActionError] = useState('');

  const { data, isLoading } = useAdminOrders({ page, limit: 20, status: statusFilter || undefined });
  const cancel = useAdminCancelOrder();
  const refund = useAdminRefundOrder();

  function openAction(order: any, kind: 'cancel' | 'refund') {
    setActionModal({ order, kind });
    setActionReason('');
    setActionRestock(kind === 'cancel');
    setActionAmount(kind === 'refund' ? String(order.totalAmount) : '');
    setActionError('');
  }

  async function runAction() {
    if (!actionModal) return;
    setActionError('');
    try {
      if (actionModal.kind === 'cancel') {
        await cancel.mutateAsync({
          id: actionModal.order.id,
          reason: actionReason || undefined,
          restock: actionRestock,
        });
      } else {
        await refund.mutateAsync({
          id: actionModal.order.id,
          reason: actionReason || undefined,
          amount: actionAmount ? Number(actionAmount) : undefined,
          restock: actionRestock,
        });
      }
      setActionModal(null);
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Action failed');
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.orders')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{data?.total ?? 0} {t('admin.allVendors')}</p>
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
          <option value="REFUNDED">{t('admin.refunded')}</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : (
        <>
          <div className="card overflow-x-auto mb-4">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3">{t('admin.order')}</th>
                  <th className="text-left px-5 py-3">{t('admin.customer')}</th>
                  <th className="text-left px-5 py-3">{t('admin.vendors_col')}</th>
                  <th className="text-left px-5 py-3">{t('cart.total')}</th>
                  <th className="text-left px-5 py-3">{t('admin.status')}</th>
                  <th className="text-left px-5 py-3">{t('admin.date')}</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((order: any) => (
                  <tbody key={order.id}>
                    <tr className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{order.id.slice(0, 8)}…</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs">{order.customer?.email}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs">
                        {Array.from(new Set<string>((order.items ?? []).map((i: any) => i.tenant?.displayName))).join(', ')}
                      </td>
                      <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">{formatPrice(order.totalAmount)}</td>
                      <td className="px-5 py-3">
                        <span className={STATUS_COLORS[order.status] ?? 'badge-gray'}>{order.status}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-gray-400">{expanded === order.id ? '▲' : '▼'}</td>
                    </tr>
                    {expanded === order.id && (
                      <tr className="bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-800">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="space-y-2">
                            {(order.items ?? []).map((item: any) => (
                              <div key={item.id} className="flex items-center gap-3 text-sm">
                                <span className="text-gray-600 dark:text-gray-300 text-xs font-mono w-24 truncate">{item.variant?.product?.title}</span>
                                <span className="text-gray-500 text-xs">SKU: {item.variant?.sku}</span>
                                <span className="text-gray-700 dark:text-gray-300">×{item.qty}</span>
                                <span className="text-gray-900 dark:text-white">{formatPrice(item.unitPriceSnapshot)}</span>
                                <span className="text-purple-600 dark:text-purple-400 text-xs">{t('common.via')} {item.tenant?.displayName}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                            {t('admin.shipTo')}: {order.shippingAddress?.name}, {order.shippingAddress?.city}, {order.shippingAddress?.country}
                            {order.paymentRef && <> · Ref: {order.paymentRef}</>}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {!['CANCELLED', 'REFUNDED'].includes(order.status) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openAction(order, 'cancel'); }}
                                className="text-xs bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/60 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg"
                              >
                                {t('adminOrder.cancel')}
                              </button>
                            )}
                            {order.status !== 'REFUNDED' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openAction(order, 'refund'); }}
                                className="text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800/60 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-lg"
                              >
                                {t('adminOrder.refund')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
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

      {actionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {actionModal.kind === 'cancel' ? t('adminOrder.cancel') : t('adminOrder.refund')} —
              <span className="font-mono text-xs ml-2">{actionModal.order.id.slice(0, 8)}…</span>
            </h3>
            {actionError && <p className="text-red-600 dark:text-red-400 text-sm">{actionError}</p>}
            <div>
              <label className="label">{t('adminOrder.reason')}</label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="input min-h-[60px]"
              />
            </div>
            {actionModal.kind === 'refund' && (
              <div>
                <label className="label">{t('adminOrder.amount')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  className="input"
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={actionRestock}
                onChange={(e) => setActionRestock(e.target.checked)}
                className="h-4 w-4 accent-purple-600"
              />
              {t('adminOrder.restock')}
            </label>
            <div className="flex gap-3">
              <button
                onClick={runAction}
                disabled={cancel.isPending || refund.isPending}
                className={`flex-1 ${actionModal.kind === 'cancel' ? 'btn-primary' : 'bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium'}`}
              >
                {cancel.isPending || refund.isPending ? t('adminOrder.processing') : (actionModal.kind === 'cancel' ? t('adminOrder.cancel') : t('adminOrder.refund'))}
              </button>
              <button onClick={() => setActionModal(null)} className="flex-1 btn-ghost">
                {t('adminOrder.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
