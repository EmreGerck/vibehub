'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminPreOrders, usePatchPreOrderStatus, type PreOrderStatus } from '../../../../hooks/useAdmin';
import { useI18n } from '../../../../lib/i18n';

const STATUS_OPTIONS: { value: PreOrderStatus; label: string; color: string }[] = [
  { value: 'AWAITING_APPROVAL', label: 'Awaiting approval',  color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { value: 'APPROVED',          label: 'Approved',           color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'PRODUCTION',        label: 'In production',      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'SHIPPED',           label: 'Shipped',            color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  { value: 'CANCELLED',         label: 'Cancelled',          color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
];

export default function AdminPreOrdersPage() {
  const t = useI18n((s) => s.t);
  const [filter, setFilter] = useState<PreOrderStatus | ''>('AWAITING_APPROVAL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminPreOrders({
    status: filter || undefined,
    page,
    limit: 25,
  });
  const patch = usePatchPreOrderStatus();

  async function changeStatus(itemId: string, status: PreOrderStatus) {
    try {
      await patch.mutateAsync({ itemId, status });
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to update status');
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pre-orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage pre-order line items. Approving a pre-order emails the customer.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value as PreOrderStatus); setPage(1); }}
          className="input max-w-xs"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <p className="py-16 text-center text-gray-500">{t('admin.loading')}</p>
        ) : !data?.items?.length ? (
          <div className="py-16 text-center">
            <p className="text-5xl mb-3">📦</p>
            <p className="text-gray-500">No pre-orders {filter ? `with status ${filter}` : 'yet'}.</p>
          </div>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Qty</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Ship date</th>
                <th className="px-5 py-3">Ordered</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const statusOpt = STATUS_OPTIONS.find((s) => s.value === item.preOrderStatus);
                const canApprove = item.preOrderStatus === 'AWAITING_APPROVAL';
                const canProduction = item.preOrderStatus === 'APPROVED';
                const canShip = item.preOrderStatus === 'APPROVED' || item.preOrderStatus === 'PRODUCTION';
                const canCancel = item.preOrderStatus !== 'CANCELLED' && item.preOrderStatus !== 'SHIPPED';

                return (
                  <tr key={item.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.variant.product.images?.[0] && (
                          <img
                            src={item.variant.product.images[0]}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/product/${item.variant.product.id}`}
                            className="font-medium text-gray-900 dark:text-white hover:text-purple-600 truncate block"
                          >
                            {item.variant.product.title}
                          </Link>
                          <p className="text-xs text-gray-500">{item.variant.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300 text-xs">
                      {item.order.customer?.email ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300 text-xs">
                      @{item.tenant.slug}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300 font-medium">{item.qty}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusOpt?.color ?? 'bg-gray-100 text-gray-700'}`}>
                        {statusOpt?.label ?? item.preOrderStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {item.preOrderShipDate
                        ? new Date(item.preOrderShipDate).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(item.order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {canApprove && (
                          <button
                            onClick={() => changeStatus(item.id, 'APPROVED')}
                            disabled={patch.isPending}
                            className="text-xs bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2.5 py-1 rounded-lg transition-colors"
                            title="Approve and email the customer"
                          >
                            Approve
                          </button>
                        )}
                        {canProduction && (
                          <button
                            onClick={() => changeStatus(item.id, 'PRODUCTION')}
                            disabled={patch.isPending}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            → Production
                          </button>
                        )}
                        {canShip && (
                          <button
                            onClick={() => changeStatus(item.id, 'SHIPPED')}
                            disabled={patch.isPending}
                            className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            → Shipped
                          </button>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => {
                              if (confirm('Cancel this pre-order line?')) changeStatus(item.id, 'CANCELLED');
                            }}
                            disabled={patch.isPending}
                            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > data.limit && (
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>{(page - 1) * data.limit + 1} – {Math.min(page * data.limit, data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost disabled:opacity-50">‹ Prev</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page * data.limit >= data.total} className="btn-ghost disabled:opacity-50">Next ›</button>
          </div>
        </div>
      )}
    </div>
  );
}
