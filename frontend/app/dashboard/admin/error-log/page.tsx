'use client';

import { useState } from 'react';
import { useErrorLog, type UserErrorLogEntry } from '../../../../hooks/useAdmin';
import { useI18n } from '../../../../lib/i18n';

export default function AdminErrorLogPage() {
  const t = useI18n((s) => s.t);
  const [page, setPage] = useState(1);
  const [errorCode, setErrorCode] = useState('');
  const [traceId, setTraceId] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selected, setSelected] = useState<UserErrorLogEntry | null>(null);

  const { data, isLoading } = useErrorLog({
    page,
    limit: 30,
    errorCode: errorCode || undefined,
    traceId: traceId || undefined,
    statusCode: statusCode ? Number(statusCode) : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const hasFilter = errorCode || traceId || statusCode || fromDate || toDate;

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t('admin.errorLogNav')}</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        {data?.total ?? 0} {t('admin.totalEntries')}
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={errorCode}
          onChange={(e) => { setErrorCode(e.target.value); setPage(1); }}
          placeholder="VH-1001"
          className="input w-32"
        />
        <input
          value={traceId}
          onChange={(e) => { setTraceId(e.target.value); setPage(1); }}
          placeholder={t('errors.trace')}
          className="input w-56 font-mono"
        />
        <select
          value={statusCode}
          onChange={(e) => { setStatusCode(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">All status</option>
          <option value="400">400</option>
          <option value="401">401</option>
          <option value="403">403</option>
          <option value="404">404</option>
          <option value="429">429</option>
          <option value="500">500</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400 shrink-0">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="input w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400 shrink-0">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="input w-auto"
          />
        </div>
        {hasFilter && (
          <button
            onClick={() => {
              setErrorCode(''); setTraceId(''); setStatusCode('');
              setFromDate(''); setToDate(''); setPage(1);
            }}
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
            {data?.items.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelected(entry)}
                className="w-full text-left card px-5 py-4 flex items-start gap-4 hover:border-red-300 dark:hover:border-red-700 transition"
              >
                <span
                  className={
                    'shrink-0 rounded px-2 py-1 text-xs font-bold font-mono ' +
                    (entry.statusCode >= 500
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300')
                  }
                >
                  {entry.errorCode}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-mono text-gray-700 dark:text-gray-300">{entry.method}</span>
                    <span className="font-mono text-gray-600 dark:text-gray-400 truncate">{entry.route}</span>
                    <span className="text-gray-500 dark:text-gray-400">→</span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">{entry.statusCode}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {entry.user?.email ?? t('admin.anonymousUser')} · {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-mono text-gray-400">{entry.traceId.slice(0, 8)}…</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 justify-end text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.prev')}</button>
            <span className="text-gray-500 dark:text-gray-400">{t('admin.page')} {page}</span>
            <button disabled={(data?.items.length ?? 0) < 30} onClick={() => setPage((p) => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.next')}</button>
          </div>
        </>
      )}

      {selected && <ErrorDrawer entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ErrorDrawer({ entry, onClose }: { entry: UserErrorLogEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto p-6 space-y-5"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Error</div>
            <div className="text-xl font-bold font-mono text-gray-900 dark:text-white">{entry.errorCode}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none">✕</button>
        </div>

        <Field label="Trace ID" mono>{entry.traceId}</Field>
        <Field label="Status">{entry.statusCode}</Field>
        <Field label="Route" mono>{entry.method} {entry.route}</Field>
        <Field label="When">{new Date(entry.createdAt).toLocaleString()}</Field>
        <Field label="User">{entry.user ? `${entry.user.email} (${entry.user.role})` : '— anonymous —'}</Field>
        {entry.ipAddress && <Field label="IP" mono>{entry.ipAddress}</Field>}
        {entry.userAgent && <Field label="User-Agent" mono>{entry.userAgent}</Field>}
        {entry.message && (
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Internal message</div>
            <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded p-3 whitespace-pre-wrap break-words">{entry.message}</pre>
          </div>
        )}
        {entry.payloadSnapshot && Object.keys(entry.payloadSnapshot).length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Payload (sanitised)</div>
            <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-3 overflow-x-auto">{JSON.stringify(entry.payloadSnapshot, null, 2)}</pre>
          </div>
        )}
        {entry.stack && (
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Stack</div>
            <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-3 overflow-x-auto">{entry.stack}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={'text-sm text-gray-900 dark:text-white break-words ' + (mono ? 'font-mono' : '')}>{children}</div>
    </div>
  );
}
