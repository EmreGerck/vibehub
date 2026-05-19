'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  usePermissionCatalog,
  useVendorPermissions,
  useSetVendorPermissions,
  useResetVendorPermissions,
  type VendorPermission,
} from '../../../../../../hooks/usePermissions';
import { useAdminVendors } from '../../../../../../hooks/useAdmin';
import { useI18n } from '../../../../../../lib/i18n';

export default function VendorPermissionsPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;
  const router = useRouter();
  const t = useI18n((s) => s.t);

  const { data: catalog = [], isLoading: catalogLoading } = usePermissionCatalog();
  const { data: granted = [], isLoading: grantedLoading } = useVendorPermissions(tenantId);
  const { data: vendorList } = useAdminVendors({ limit: 200 });
  const setPerms = useSetVendorPermissions();
  const resetPerms = useResetVendorPermissions();

  const [selected, setSelected] = useState<Set<VendorPermission>>(new Set());
  const [confirmReset, setConfirmReset] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Sync selection with server-loaded grants
  useEffect(() => {
    setSelected(new Set(granted));
  }, [granted.join('|')]);

  const vendor = vendorList?.items.find((v: any) => v.id === tenantId);

  const isLoading = catalogLoading || grantedLoading;
  const dirty = (() => {
    if (selected.size !== granted.length) return true;
    for (const p of granted) if (!selected.has(p)) return true;
    return false;
  })();

  function toggle(p: VendorPermission) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function save() {
    try {
      await setPerms.mutateAsync({ tenantId, permissions: Array.from(selected) });
      setSavedAt(new Date());
    } catch (err) {
      console.error(err);
    }
  }

  async function reset() {
    try {
      await resetPerms.mutateAsync(tenantId);
      setConfirmReset(false);
      setSavedAt(new Date());
    } catch (err) {
      console.error(err);
    }
  }

  function selectAll() {
    setSelected(new Set(catalog.map((c) => c.permission)));
  }
  function selectNone() {
    setSelected(new Set());
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <button
        onClick={() => router.push('/dashboard/admin/vendors')}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        {t('perm.backToVendors')}
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('perm.title')} {vendor ? `— ${vendor.displayName}` : ''}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('perm.intro')}</p>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('perm.loading')}</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4 text-xs">
            <button onClick={selectAll} className="btn-ghost px-3 py-1">
              {t('perm.selectAll')}
            </button>
            <button onClick={selectNone} className="btn-ghost px-3 py-1">
              {t('perm.selectNone')}
            </button>
            <button
              onClick={() => setConfirmReset(true)}
              className="btn-ghost px-3 py-1"
              disabled={resetPerms.isPending}
            >
              {t('perm.resetDefaults')}
            </button>
            <span className="ml-auto text-gray-500 dark:text-gray-400">
              {selected.size} / {catalog.length} {t('perm.grantedCount')}
            </span>
          </div>

          <div className="card overflow-x-auto mb-4">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3 w-12"></th>
                  <th className="text-left px-5 py-3">{t('perm.colPermission')}</th>
                  <th className="text-left px-5 py-3">{t('perm.colDescription')}</th>
                  <th className="text-left px-5 py-3">{t('perm.colDefault')}</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((entry) => {
                  const checked = selected.has(entry.permission);
                  return (
                    <tr
                      key={entry.permission}
                      className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    >
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(entry.permission)}
                          className="h-4 w-4 accent-purple-600"
                        />
                      </td>
                      <td className="px-5 py-3 text-gray-900 dark:text-white font-mono text-xs">
                        {entry.permission}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {entry.description}
                      </td>
                      <td className="px-5 py-3">
                        {entry.isDefault ? (
                          <span className="badge-gray text-xs">{t('perm.default')}</span>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            {t('perm.optIn')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={!dirty || setPerms.isPending}
              className="btn-primary disabled:opacity-40"
            >
              {setPerms.isPending ? t('perm.saving') : t('perm.save')}
            </button>
            {dirty && (
              <span className="text-xs text-amber-600 dark:text-amber-400">{t('perm.unsaved')}</span>
            )}
            {savedAt && !dirty && (
              <span className="text-xs text-green-600 dark:text-green-400">
                {t('perm.savedAt')} {savedAt.toLocaleTimeString()}
              </span>
            )}
          </div>
        </>
      )}

      {confirmReset && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card p-6 w-96 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('perm.resetTitle')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('perm.resetDesc')}</p>
            <div className="flex gap-3">
              <button
                onClick={reset}
                disabled={resetPerms.isPending}
                className="flex-1 btn-primary"
              >
                {resetPerms.isPending ? t('perm.resetting') : t('perm.reset')}
              </button>
              <button onClick={() => setConfirmReset(false)} className="flex-1 btn-ghost">
                {t('perm.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
