'use client';

import { useState, useMemo } from 'react';
import { useErrorCodes } from '../../../../hooks/useAdmin';
import { useI18n } from '../../../../lib/i18n';

const SEVERITY_STYLES: Record<string, string> = {
  P0: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  P1: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  P2: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
};

export default function AdminErrorCodesPage() {
  const t = useI18n((s) => s.t);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useErrorCodes();

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((c) =>
      c.code.toLowerCase().includes(q) ||
      c.internalDescription.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t('admin.errorCodesNav')}</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        {data?.length ?? 0} {t('admin.totalEntries')} — {t('admin.errorCodesHint')}
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="VH-1001, orders, mfg…"
        className="input w-80 mb-6"
      />

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.code} className="card px-5 py-4 flex items-start gap-4">
              <span className="shrink-0 font-mono font-bold text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {c.code}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs mb-1">
                  <span className={'rounded px-2 py-0.5 font-bold ' + (SEVERITY_STYLES[c.severity] ?? '')}>
                    {c.severity}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{c.domain}</span>
                  <span className="text-gray-400 dark:text-gray-500">·</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">HTTP {c.httpStatus}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{c.internalDescription}</p>
                {c.userMessage && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="font-semibold">User:</span> {c.userMessage}
                  </p>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12">{t('admin.noMatches')}</p>
          )}
        </div>
      )}
    </div>
  );
}
