'use client';

import { useState } from 'react';
import { useMyMedia, useCreateMedia, useUpdateMedia, useDeleteMedia } from '../../../../hooks/useMedia';
import { useI18n } from '../../../../lib/i18n';
import type { VendorMedia, MediaType } from '../../../../types';

export default function VendorMediaPage() {
  const t = useI18n((s) => s.t);
  const { data: items, isLoading } = useMyMedia();
  const create = useCreateMedia();
  const update = useUpdateMedia();
  const del = useDeleteMedia();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'SPOTIFY' as MediaType, url: '', title: '' });
  const [formError, setFormError] = useState('');
  const [confirmDel, setConfirmDel] = useState<VendorMedia | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    try {
      await create.mutateAsync({ type: form.type, url: form.url, title: form.title || undefined });
      setForm({ type: 'SPOTIFY', url: '', title: '' });
      setShowForm(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? t('media.invalidUrl'));
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('media.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{items?.length ?? 0} {t('admin.total')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? t('admin.cancel') : t('media.add')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('media.add')}</h2>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">{t('media.type')}</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as MediaType }))} className="input">
                <option value="SPOTIFY">Spotify</option>
                <option value="YOUTUBE">YouTube</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">{form.type === 'SPOTIFY' ? t('media.spotifyUrl') : t('media.youtubeUrl')}</label>
              <input required value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="input" placeholder={form.type === 'SPOTIFY' ? 'https://open.spotify.com/...' : 'https://www.youtube.com/watch?v=...'} />
            </div>
            <div className="col-span-3">
              <label className="label">{t('media.titleLabel')}</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" />
            </div>
          </div>
          <button type="submit" disabled={create.isPending} className="btn-primary">
            {create.isPending ? t('media.saving') : t('media.save')}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : !items?.length ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🎵</p>
          <p>{t('media.noMedia')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((m: VendorMedia) => (
            <div key={m.id} className="card p-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{m.type === 'SPOTIFY' ? '🎵' : '▶️'}</span>
                  <p className="font-medium text-gray-900 dark:text-white">{m.title ?? (m.type === 'SPOTIFY' ? 'Spotify' : 'YouTube')}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.active ? 'badge-green' : 'badge-red'}`}>
                    {m.active ? t('media.active') : t('media.inactive')}
                  </span>
                </div>
                {/* Preview iframe */}
                <iframe
                  src={m.url}
                  width="100%"
                  height={m.type === 'SPOTIFY' ? 80 : 200}
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  className="rounded-lg"
                />
              </div>
              <div className="flex sm:flex-col gap-2 shrink-0">
                <button
                  onClick={() => update.mutate({ id: m.id, active: !m.active })}
                  className="text-xs bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg"
                >
                  {m.active ? t('media.inactive') : t('media.active')}
                </button>
                <button
                  onClick={() => setConfirmDel(m)}
                  className="text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-lg"
                >
                  {t('media.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('media.deleteConfirm')}</h3>
            <div className="flex gap-3">
              <button onClick={async () => { await del.mutateAsync(confirmDel.id); setConfirmDel(null); }} disabled={del.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium">
                {del.isPending ? '…' : t('media.delete')}
              </button>
              <button onClick={() => setConfirmDel(null)} className="flex-1 btn-ghost">{t('admin.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
