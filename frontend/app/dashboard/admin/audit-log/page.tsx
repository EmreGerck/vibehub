'use client';

import { useState } from 'react';
import { useAuditLog } from '../../../../hooks/useAdmin';
import { useI18n } from '../../../../lib/i18n';

export default function AdminAuditLogPage() {
  const t = useI18n((s) => s.t);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data, isLoading } = useAuditLog({
    page,
    limit: 30,
    action: action || undefined,
    targetType: targetType || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t('admin.auditLogTitle')}</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{data?.total ?? 0} {t('admin.totalEntries')}</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={action}
          onChange={e => { setAction(e.target.value); setPage(1); }}
          placeholder={t('admin.filterByAction')}
          className="input w-56"
        />
        <select
          value={targetType}
          onChange={e => { setTargetType(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">{t('admin.allTargets')}</option>
          <option value="Tenant">Tenant</option>
          <option value="Product">Product</option>
          <option value="Order">Order</option>
          <option value="User">User</option>
          <option value="Payout">Payout</option>
          <option value="NfcTag">NfcTag</option>
          <option value="PlatformSettings">PlatformSettings</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400 shrink-0">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPage(1); }}
            className="input w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400 shrink-0">To</label>
          <input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setPage(1); }}
            className="input w-auto"
          />
        </div>
        {(action || targetType || fromDate || toDate) && (
          <button
            onClick={() => { setAction(''); setTargetType(''); setFromDate(''); setToDate(''); setPage(1); }}
            className="text-xs text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2"
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : data?.items.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">{t('admin.noAuditEntries')}</p>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {data?.items.map((entry: any) => (
              <div key={entry.id} className="card px-5 py-4 flex items-start gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold">
                  {entry.actor?.email?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded">{entry.action}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('common.on')}</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300">{entry.targetType}</span>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{entry.targetId?.slice(0, 8)}…</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('common.by')} <span className="text-gray-900 dark:text-white">{entry.actor?.email ?? 'unknown'}</span>
                    {' · '}{new Date(entry.createdAt).toLocaleString()}
                  </p>
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">{t('admin.metadata')}</summary>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2 mt-1 overflow-x-auto">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 justify-end text-sm">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.prev')}</button>
            <span className="text-gray-500 dark:text-gray-400">{t('admin.page')} {page}</span>
            <button disabled={(data?.items.length ?? 0) < 30} onClick={() => setPage(p => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.next')}</button>
          </div>
        </>
      )}
    </div>
  );
}
