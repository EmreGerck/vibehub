'use client';

import { useState } from 'react';
import { useNfcTags, useCreateNfcTag, useUpdateNfcTag, useDeleteNfcTag, useResetNfcScanCount, useBulkUpdateNfcDestination } from '../../../../hooks/useNfcTags';
import { useAdminVendors } from '../../../../hooks/useAdmin';
import { useI18n } from '../../../../lib/i18n';
import type { NfcTag } from '../../../../types';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'https://vibehub.com.tr';

const QUICK_PATHS = [
  { label: 'Homepage', path: '/' },
  { label: 'Shop', path: '/shop' },
  { label: 'Artists', path: '/artists' },
  { label: 'Store (edit slug)', path: '/store/my-artist' },
];

type DestType = 'external' | 'internal';

function DestinationField({
  destType,
  setDestType,
  externalUrl,
  setExternalUrl,
  internalPath,
  setInternalPath,
  required,
}: {
  destType: DestType;
  setDestType: (t: DestType) => void;
  externalUrl: string;
  setExternalUrl: (v: string) => void;
  internalPath: string;
  setInternalPath: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      {/* Toggle */}
      <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setDestType('external')}
          className={`text-xs px-3 py-1 rounded-md transition-colors font-medium ${
            destType === 'external'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          External URL
        </button>
        <button
          type="button"
          onClick={() => setDestType('internal')}
          className={`text-xs px-3 py-1 rounded-md transition-colors font-medium ${
            destType === 'internal'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Internal page
        </button>
      </div>

      {destType === 'external' ? (
        <input
          required={required}
          type="url"
          value={externalUrl}
          onChange={e => setExternalUrl(e.target.value)}
          className="input"
          placeholder="https://..."
        />
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              required={required}
              value={internalPath}
              onChange={e => setInternalPath(e.target.value)}
              className="input flex-1 font-mono text-sm"
              placeholder="/shop"
            />
          </div>
          {/* Quick-pick buttons */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PATHS.map(qp => (
              <button
                key={qp.path}
                type="button"
                onClick={() => setInternalPath(qp.path)}
                className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"
              >
                {qp.label}
              </button>
            ))}
          </div>
          {/* Preview */}
          {internalPath && (
            <p className="text-xs text-gray-400 font-mono truncate">
              Preview: <span className="text-purple-600 dark:text-purple-400">{FRONTEND_URL}{internalPath}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function resolveDestUrl(destType: DestType, externalUrl: string, internalPath: string): string {
  if (destType === 'external') return externalUrl;
  return `${FRONTEND_URL}${internalPath}`;
}

export default function AdminNfcTagsPage() {
  const t = useI18n((s) => s.t);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useNfcTags({ page, limit: 20, search: search || undefined });
  const create = useCreateNfcTag();
  const update = useUpdateNfcTag();
  const del = useDeleteNfcTag();
  const resetCount = useResetNfcScanCount();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', staticUrl: '', tenantId: '' });
  const [formDestType, setFormDestType] = useState<DestType>('external');
  const [formExternalUrl, setFormExternalUrl] = useState('');
  const [formInternalPath, setFormInternalPath] = useState('');
  const [formError, setFormError] = useState('');

  const [editTag, setEditTag] = useState<NfcTag | null>(null);
  const [editForm, setEditForm] = useState({ name: '', staticUrl: '' });
  const [editDestType, setEditDestType] = useState<DestType>('external');
  const [editExternalUrl, setEditExternalUrl] = useState('');
  const [editInternalPath, setEditInternalPath] = useState('');
  const [editError, setEditError] = useState('');

  const [confirmDel, setConfirmDel] = useState<NfcTag | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Bulk update state
  const bulkUpdate = useBulkUpdateNfcDestination();
  const { data: vendorList } = useAdminVendors({ limit: 200 });
  const [showBulk, setShowBulk] = useState(false);
  const [bulkTenantId, setBulkTenantId] = useState('');
  const [bulkDestType, setBulkDestType] = useState<DestType>('external');
  const [bulkExternalUrl, setBulkExternalUrl] = useState('');
  const [bulkInternalPath, setBulkInternalPath] = useState('/');
  const [bulkError, setBulkError] = useState('');
  const [bulkResult, setBulkResult] = useState<{ updated: number } | null>(null);

  async function handleBulkUpdate(e: React.FormEvent) {
    e.preventDefault();
    setBulkError('');
    setBulkResult(null);
    const destinationUrl = resolveDestUrl(bulkDestType, bulkExternalUrl, bulkInternalPath);
    try {
      const result = await bulkUpdate.mutateAsync({ tenantId: bulkTenantId, destinationUrl });
      setBulkResult(result);
      setBulkTenantId('');
      setBulkExternalUrl('');
      setBulkInternalPath('/');
    } catch (err: any) {
      setBulkError(err?.response?.data?.message ?? 'Bulk update failed');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const destinationUrl = resolveDestUrl(formDestType, formExternalUrl, formInternalPath);
    try {
      await create.mutateAsync({
        name: form.name,
        destinationUrl,
        staticUrl: form.staticUrl || undefined,
        tenantId: form.tenantId || undefined,
      });
      setForm({ name: '', staticUrl: '', tenantId: '' });
      setFormExternalUrl('');
      setFormInternalPath('');
      setFormDestType('external');
      setShowForm(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Failed to create tag');
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTag) return;
    setEditError('');
    const destinationUrl = resolveDestUrl(editDestType, editExternalUrl, editInternalPath);
    try {
      await update.mutateAsync({
        id: editTag.id,
        name: editForm.name,
        staticUrl: editForm.staticUrl || undefined,
        destinationUrl,
      });
      setEditTag(null);
    } catch (err: any) {
      setEditError(err?.response?.data?.message ?? 'Failed to update tag');
    }
  }

  async function handleDelete() {
    if (!confirmDel) return;
    await del.mutateAsync(confirmDel.id);
    setConfirmDel(null);
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function openEditTag(tag: NfcTag) {
    setEditTag(tag);
    setEditForm({ name: tag.name, staticUrl: tag.staticUrl });
    setEditError('');
    // Detect if destination is an internal URL
    if (tag.destinationUrl.startsWith(FRONTEND_URL)) {
      setEditDestType('internal');
      setEditInternalPath(tag.destinationUrl.slice(FRONTEND_URL.length) || '/');
      setEditExternalUrl('');
    } else {
      setEditDestType('external');
      setEditExternalUrl(tag.destinationUrl);
      setEditInternalPath('');
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nfc.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{data?.total ?? 0} {t('admin.total')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowBulk(!showBulk); setShowForm(false); }}
            className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {showBulk ? 'İptal' : '⚡ Toplu Güncelle'}
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowBulk(false); }} className="btn-primary">
            {showForm ? t('admin.cancel') : t('nfc.newTag')}
          </button>
        </div>
      </div>

      {/* Bulk update panel */}
      {showBulk && (
        <form onSubmit={handleBulkUpdate} className="card p-6 mb-6 space-y-4 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h2 className="font-semibold text-gray-900 dark:text-white">Vendora Göre Toplu URL Güncelleme</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Seçilen vendora ait tüm NFC etiketlerinin hedef URL'ini tek seferde değiştirir.
          </p>
          {bulkError && <p className="text-red-600 text-sm">{bulkError}</p>}
          {bulkResult && (
            <div className="px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
              ✅ {bulkResult.updated} etiket güncellendi.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Vendor seç</label>
              <select
                required
                value={bulkTenantId}
                onChange={e => setBulkTenantId(e.target.value)}
                className="input"
              >
                <option value="">— Vendor seçin —</option>
                {(vendorList?.items ?? []).map((v: any) => (
                  <option key={v.id} value={v.id}>{v.displayName} (@{v.slug})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Yeni Hedef URL</label>
              <DestinationField
                destType={bulkDestType}
                setDestType={setBulkDestType}
                externalUrl={bulkExternalUrl}
                setExternalUrl={setBulkExternalUrl}
                internalPath={bulkInternalPath}
                setInternalPath={setBulkInternalPath}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={bulkUpdate.isPending || !bulkTenantId}
            className="px-5 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-50 transition-colors"
          >
            {bulkUpdate.isPending ? 'Güncelleniyor…' : 'Toplu Güncelle'}
          </button>
        </form>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('nfc.createTag')}</h2>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('nfc.name')}</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="e.g. Stage Door Tag #1"
              />
            </div>
            <div>
              <label className="label">{t('nfc.redirectUrl')}</label>
              <DestinationField
                destType={formDestType}
                setDestType={setFormDestType}
                externalUrl={formExternalUrl}
                setExternalUrl={setFormExternalUrl}
                internalPath={formInternalPath}
                setInternalPath={setFormInternalPath}
                required
              />
            </div>
            <div>
              <label className="label">Vendor (opsiyonel)</label>
              <select
                value={form.tenantId}
                onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))}
                className="input"
              >
                <option value="">— Vendora atama —</option>
                {(vendorList?.items ?? []).map((v: any) => (
                  <option key={v.id} value={v.id}>{v.displayName} (@{v.slug})</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">
                {t('nfc.staticUrl')}
                <span className="text-gray-400 font-normal ml-1 text-xs">({t('nfc.staticUrlHint')})</span>
              </label>
              <input
                type="url"
                value={form.staticUrl}
                onChange={e => setForm(f => ({ ...f, staticUrl: e.target.value }))}
                className="input font-mono text-sm"
                placeholder="https://... (leave blank to auto-generate)"
              />
            </div>
          </div>
          <button type="submit" disabled={create.isPending} className="btn-primary">
            {create.isPending ? t('nfc.saving') : t('nfc.createTag')}
          </button>
        </form>
      )}

      <div className="mb-4">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={`${t('admin.search')} ${t('nfc.name').toLowerCase()}…`}
          className="input w-full sm:w-72"
        />
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : (
        <>
          <div className="card overflow-x-auto mb-4">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3">{t('nfc.name')}</th>
                  <th className="text-left px-5 py-3">{t('nfc.staticUrl')}</th>
                  <th className="text-left px-5 py-3">{t('nfc.redirectUrl')}</th>
                  <th className="text-left px-5 py-3">{t('nfc.scanCount')}</th>
                  <th className="text-left px-5 py-3">{t('nfc.lastScanned')}</th>
                  <th className="text-left px-5 py-3">{t('admin.status')}</th>
                  <th className="text-left px-5 py-3">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((tag: NfcTag) => (
                  <tr key={tag.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">{tag.name}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]" title={tag.staticUrl}>
                          {tag.staticUrl}
                        </span>
                        <button
                          onClick={() => copyUrl(tag.staticUrl)}
                          className="shrink-0 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded"
                        >
                          {copied === tag.staticUrl ? t('nfc.copied') : t('nfc.copyUrl')}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-[200px]">
                      <div className="truncate" title={tag.destinationUrl}>
                        {tag.destinationUrl.startsWith(FRONTEND_URL) && (
                          <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs px-1.5 py-0.5 rounded mr-1">
                            internal
                          </span>
                        )}
                        {tag.destinationUrl}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">{tag.scanCount}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {tag.lastScannedAt ? new Date(tag.lastScannedAt).toLocaleDateString() : t('nfc.never')}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tag.enabled ? 'badge-green' : 'badge-red'}`}>
                        {tag.enabled ? t('nfc.enabled') : t('nfc.disabled')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => openEditTag(tag)}
                          className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg"
                        >
                          {t('adminReview.edit')}
                        </button>
                        <button
                          onClick={() => update.mutate({ id: tag.id, enabled: !tag.enabled })}
                          className="text-xs bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg"
                        >
                          {tag.enabled ? t('nfc.disabled') : t('nfc.enabled')}
                        </button>
                        <button
                          onClick={() => resetCount.mutate(tag.id)}
                          className="text-xs bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg"
                        >
                          {t('nfc.resetCount')}
                        </button>
                        <button
                          onClick={() => setConfirmDel(tag)}
                          className="text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-lg"
                        >
                          {t('nfc.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(data?.items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">{t('nfc.noTags')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 justify-end text-sm">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.prev')}</button>
            <span className="text-gray-500">{t('admin.page')} {page}</span>
            <button disabled={(data?.items.length ?? 0) < 20} onClick={() => setPage(p => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.next')}</button>
          </div>
        </>
      )}

      {/* Edit modal */}
      {editTag && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleEdit} className="card p-6 w-full max-w-lg space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('nfc.editTag')}</h3>
            {editError && <p className="text-red-600 text-sm">{editError}</p>}
            <div>
              <label className="label">{t('nfc.name')}</label>
              <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">
                {t('nfc.staticUrl')}
                <span className="text-gray-400 font-normal ml-1 text-xs">({t('nfc.staticUrlHint')})</span>
              </label>
              <input
                required
                type="url"
                value={editForm.staticUrl}
                onChange={e => setEditForm(f => ({ ...f, staticUrl: e.target.value }))}
                className="input font-mono text-sm"
              />
            </div>
            <div>
              <label className="label">{t('nfc.redirectUrl')}</label>
              <DestinationField
                destType={editDestType}
                setDestType={setEditDestType}
                externalUrl={editExternalUrl}
                setExternalUrl={setEditExternalUrl}
                internalPath={editInternalPath}
                setInternalPath={setEditInternalPath}
                required
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={update.isPending} className="flex-1 btn-primary">
                {update.isPending ? t('nfc.saving') : t('nfc.save')}
              </button>
              <button type="button" onClick={() => setEditTag(null)} className="flex-1 btn-ghost">{t('admin.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('nfc.deleteConfirm')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">"{confirmDel.name}"</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={del.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium">
                {del.isPending ? '…' : t('nfc.delete')}
              </button>
              <button onClick={() => setConfirmDel(null)} className="flex-1 btn-ghost">{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
