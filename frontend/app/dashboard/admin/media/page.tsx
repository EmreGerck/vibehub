'use client';

import { useState } from 'react';
import { useAdminVendors } from '../../../../hooks/useAdmin';
import { useAdminVendorMedia, useAdminCreateMedia, useAdminUpdateMedia, useAdminDeleteMedia } from '../../../../hooks/useMedia';
import { useI18n } from '../../../../lib/i18n';
import type { VendorMedia, MediaType } from '../../../../types';

const MEDIA_TYPES: MediaType[] = ['SPOTIFY', 'YOUTUBE'];

function typeIcon(type: MediaType) {
  return type === 'SPOTIFY' ? '🎵' : '▶️';
}

function typeLabel(type: MediaType) {
  return type === 'SPOTIFY' ? 'Spotify' : 'YouTube';
}

interface MediaFormState {
  type: MediaType;
  url: string;
  title: string;
}

const defaultForm: MediaFormState = { type: 'SPOTIFY', url: '', title: '' };

export default function AdminMediaPage() {
  const t = useI18n((s) => s.t);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingMedia, setEditingMedia] = useState<VendorMedia | null>(null);
  const [form, setForm] = useState<MediaFormState>(defaultForm);
  const [error, setError] = useState('');

  const { data: vendorsData, isLoading: vendorsLoading } = useAdminVendors({ limit: 100 });
  const vendors = vendorsData?.items ?? [];

  const { data: mediaItems, isLoading: mediaLoading } = useAdminVendorMedia(selectedTenant || undefined);
  const createMedia = useAdminCreateMedia();
  const updateMedia = useAdminUpdateMedia();
  const deleteMedia = useAdminDeleteMedia();

  function openCreate() {
    setForm(defaultForm);
    setError('');
    setEditingMedia(null);
    setShowCreate(true);
  }

  function openEdit(item: VendorMedia) {
    setForm({ type: item.type as MediaType, url: item.url, title: item.title ?? '' });
    setError('');
    setEditingMedia(item);
    setShowCreate(true);
  }

  function closeModal() {
    setShowCreate(false);
    setEditingMedia(null);
    setForm(defaultForm);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editingMedia) {
        await updateMedia.mutateAsync({ id: editingMedia.id, type: form.type, url: form.url, title: form.title || undefined });
      } else {
        if (!selectedTenant) { setError('Please select a vendor first'); return; }
        await createMedia.mutateAsync({ tenantId: selectedTenant, type: form.type, url: form.url, title: form.title || undefined });
      }
      closeModal();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Operation failed');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this media embed?')) return;
    try {
      await deleteMedia.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Delete failed');
    }
  }

  async function handleToggleActive(item: VendorMedia) {
    try {
      await updateMedia.mutateAsync({ id: item.id, active: !item.active });
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Update failed');
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.mediaManagement')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage Spotify & YouTube embeds for vendor store pages</p>
        </div>
        <button onClick={openCreate} disabled={!selectedTenant} className="btn-primary disabled:opacity-50">
          + Add Embed
        </button>
      </div>

      {/* Vendor selector */}
      <div className="card p-4 mb-6">
        <label className="label mb-2">Select Vendor</label>
        <select
          value={selectedTenant}
          onChange={e => setSelectedTenant(e.target.value)}
          className="input max-w-sm"
        >
          <option value="">{vendorsLoading ? 'Loading…' : '— Select a vendor —'}</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id}>{v.displayName} (@{v.slug})</option>
          ))}
        </select>
      </div>

      {/* Media list */}
      {!selectedTenant ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🎵</div>
          <p>Select a vendor above to view their media embeds</p>
        </div>
      ) : mediaLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : !mediaItems || mediaItems.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🎵</div>
          <p>No media embeds yet for this vendor</p>
          <button onClick={openCreate} className="btn-primary mt-4">Add First Embed</button>
        </div>
      ) : (
        <div className="space-y-3">
          {mediaItems.map((item) => (
            <div key={item.id} className="card px-5 py-4 flex items-center gap-4">
              <span className="text-2xl shrink-0">{typeIcon(item.type as MediaType)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    item.type === 'SPOTIFY'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>{typeLabel(item.type as MediaType)}</span>
                  {item.title && <span className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded ${item.active ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    {item.active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{item.url}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleActive(item)}
                  disabled={updateMedia.isPending}
                  className="text-xs text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {item.active ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => openEdit(item)} className="btn-ghost text-xs px-3 py-1">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors px-2 py-1">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editingMedia ? 'Edit Media Embed' : 'Add Media Embed'}
            </h2>
            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as MediaType }))}
                  className="input"
                >
                  {MEDIA_TYPES.map(t => (
                    <option key={t} value={t}>{typeIcon(t)} {typeLabel(t)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">URL</label>
                <input
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder={form.type === 'SPOTIFY' ? 'https://open.spotify.com/…' : 'https://youtube.com/watch?v=…'}
                  className="input"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Paste the full Spotify or YouTube URL — we'll convert it to an embed automatically.</p>
              </div>
              <div>
                <label className="label">Title <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Latest Album, Live Set…"
                  className="input"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
                <button
                  type="submit"
                  disabled={createMedia.isPending || updateMedia.isPending}
                  className="btn-primary"
                >
                  {(createMedia.isPending || updateMedia.isPending) ? 'Saving…' : editingMedia ? 'Save Changes' : 'Add Embed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
