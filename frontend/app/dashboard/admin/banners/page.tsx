'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import type { ApiResponse } from '../../../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  heading: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string | null;
  gradient: string;
  buttonGradient: string;
  sortOrder: number;
  active: boolean;
  translations?: Record<string, any> | null;
  tenant?: { id: string; slug: string; displayName: string } | null;
}

type LangTab = 'tr' | 'en';

interface BannerForm {
  title: string;
  subtitleTr: string;
  subtitleEn: string;
  headingTr: string;
  headingEn: string;
  descriptionTr: string;
  descriptionEn: string;
  buttonTextTr: string;
  buttonTextEn: string;
  buttonLink: string;
  imageUrl: string;
  gradient: string;
  buttonGradient: string;
  sortOrder: number;
  tenantId: string;
}

const EMPTY_FORM: BannerForm = {
  title: '',
  subtitleTr: '',
  subtitleEn: '',
  headingTr: '',
  headingEn: '',
  descriptionTr: '',
  descriptionEn: '',
  buttonTextTr: '',
  buttonTextEn: '',
  buttonLink: '',
  imageUrl: '',
  gradient: 'linear-gradient(135deg, #070A12 0%, #0B1022 45%, #070A12 100%)',
  buttonGradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 55%, #F97316 100%)',
  sortOrder: 0,
  tenantId: '',
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useBannersAdmin() {
  return useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<HeroBanner[]>>('/admin/banners');
      return res.data.data;
    },
  });
}

function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post<ApiResponse<HeroBanner>>('/admin/banners', body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });
}

function useUpdateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Record<string, unknown>) => {
      const res = await api.patch<ApiResponse<HeroBanner>>(`/admin/banners/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });
}

function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/admin/banners/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });
}

function useToggleBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<ApiResponse<HeroBanner>>(`/admin/banners/${id}/toggle`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });
}

// ── Bilingual field group ─────────────────────────────────────────────────────

function BilingualRow({
  label,
  langTab,
  setLangTab,
  valueTr,
  valueEn,
  onTr,
  onEn,
  multiline = false,
  required = false,
}: {
  label: string;
  langTab: LangTab;
  setLangTab: (l: LangTab) => void;
  valueTr: string;
  valueEn: string;
  onTr: (v: string) => void;
  onEn: (v: string) => void;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="label mb-0">{label}</label>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs">
          {(['tr', 'en'] as LangTab[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLangTab(l)}
              className={`px-3 py-1 font-medium transition-colors ${
                langTab === l
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {langTab === 'tr' ? (
        multiline ? (
          <textarea required={required} rows={3} value={valueTr} onChange={(e) => onTr(e.target.value)}
            placeholder="Türkçe (zorunlu)" className="input resize-none" />
        ) : (
          <input required={required} value={valueTr} onChange={(e) => onTr(e.target.value)}
            placeholder="Türkçe (zorunlu)" className="input" />
        )
      ) : multiline ? (
        <textarea rows={3} value={valueEn} onChange={(e) => onEn(e.target.value)}
          placeholder="English (optional — falls back to Turkish if empty)" className="input resize-none" />
      ) : (
        <input value={valueEn} onChange={(e) => onEn(e.target.value)}
          placeholder="English (optional — falls back to Turkish if empty)" className="input" />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminBannersPage() {
  const { data: banners = [], isLoading } = useBannersAdmin();
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  const toggleBanner = useToggleBanner();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Per-field language tabs
  const [ltSubtitle, setLtSubtitle] = useState<LangTab>('tr');
  const [ltHeading, setLtHeading] = useState<LangTab>('tr');
  const [ltDesc, setLtDesc] = useState<LangTab>('tr');
  const [ltButton, setLtButton] = useState<LangTab>('tr');

  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    resetLangTabs();
    setShowForm(true);
  }

  function openEdit(banner: HeroBanner) {
    setEditingId(banner.id);
    const en = (banner.translations as any)?.en ?? {};
    setForm({
      title: banner.title,
      subtitleTr: banner.subtitle,
      subtitleEn: en.subtitle ?? '',
      headingTr: banner.heading,
      headingEn: en.heading ?? '',
      descriptionTr: banner.description,
      descriptionEn: en.description ?? '',
      buttonTextTr: banner.buttonText,
      buttonTextEn: en.buttonText ?? '',
      buttonLink: banner.buttonLink,
      imageUrl: banner.imageUrl ?? '',
      gradient: banner.gradient,
      buttonGradient: banner.buttonGradient,
      sortOrder: banner.sortOrder,
      tenantId: banner.tenant?.id ?? '',
    });
    resetLangTabs();
    setShowForm(true);
  }

  function resetLangTabs() {
    setLtSubtitle('tr');
    setLtHeading('tr');
    setLtDesc('tr');
    setLtButton('tr');
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function set(field: keyof BannerForm, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function buildPayload() {
    const en: Record<string, string> = {};
    if (form.subtitleEn.trim()) en.subtitle = form.subtitleEn.trim();
    if (form.headingEn.trim()) en.heading = form.headingEn.trim();
    if (form.descriptionEn.trim()) en.description = form.descriptionEn.trim();
    if (form.buttonTextEn.trim()) en.buttonText = form.buttonTextEn.trim();

    const body: Record<string, unknown> = {
      title: form.title,
      subtitle: form.subtitleTr,
      heading: form.headingTr,
      description: form.descriptionTr,
      buttonText: form.buttonTextTr,
      buttonLink: form.buttonLink,
      gradient: form.gradient,
      buttonGradient: form.buttonGradient,
      sortOrder: form.sortOrder,
      translations: Object.keys(en).length ? { en } : null,
    };
    if (form.imageUrl) body.imageUrl = form.imageUrl;
    if (form.tenantId) body.tenantId = form.tenantId;
    return body;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = buildPayload();
    if (editingId) {
      await updateBanner.mutateAsync({ id: editingId, ...body });
    } else {
      await createBanner.mutateAsync(body);
    }
    closeForm();
  }

  async function handleDelete(id: string) {
    await deleteBanner.mutateAsync(id);
    setDeleteConfirm(null);
  }

  const isPending = createBanner.isPending || updateBanner.isPending;

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hero Banners</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage hero slider banners with TR/EN content</p>
        </div>
        <button onClick={openCreate} className="btn-primary">New Banner</button>
      </div>

      {isLoading && <div className="text-center py-16 text-gray-400">Loading…</div>}

      {!isLoading && banners.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-16 text-center text-gray-500 dark:text-gray-400">
          No banners yet — create one above.
        </div>
      )}

      {!isLoading && banners.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3">Heading (TR)</th>
                <th className="text-left px-4 py-3">Vendor</th>
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">EN?</th>
                <th className="text-left px-4 py-3">Active</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((banner) => {
                const hasEn = !!(banner.translations as any)?.en;
                return (
                  <tr key={banner.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{banner.heading}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {banner.tenant?.displayName ?? <span className="text-gray-400 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{banner.sortOrder}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${hasEn ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-600'}`}>
                        {hasEn ? '✓ EN' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleBanner.mutate(banner.id)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          banner.active ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                          banner.active ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(banner)}
                          className="text-xs border border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        {deleteConfirm === banner.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(banner.id)}
                              className="text-xs text-red-600 border border-red-300 dark:border-red-800 px-3 py-1.5 rounded-lg">
                              Confirm
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 px-2 py-1.5">×</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(banner.id)}
                            className="text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800 px-3 py-1.5 rounded-lg transition-colors">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto card p-6">
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
              {editingId ? 'Edit Banner' : 'New Banner'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Turkish is the default. English is optional — if left blank, Turkish content is shown for all users.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Internal title */}
              <div>
                <label className="label">Internal title (not shown publicly)</label>
                <input required value={form.title} onChange={(e) => set('title', e.target.value)} className="input" />
              </div>

              {/* Subtitle */}
              <BilingualRow
                label="Subtitle (eyebrow text)"
                langTab={ltSubtitle} setLangTab={setLtSubtitle}
                valueTr={form.subtitleTr} valueEn={form.subtitleEn}
                onTr={(v) => set('subtitleTr', v)} onEn={(v) => set('subtitleEn', v)}
                required
              />

              {/* Heading */}
              <BilingualRow
                label="Heading (large title)"
                langTab={ltHeading} setLangTab={setLtHeading}
                valueTr={form.headingTr} valueEn={form.headingEn}
                onTr={(v) => set('headingTr', v)} onEn={(v) => set('headingEn', v)}
                required
              />

              {/* Description */}
              <BilingualRow
                label="Description"
                langTab={ltDesc} setLangTab={setLtDesc}
                valueTr={form.descriptionTr} valueEn={form.descriptionEn}
                onTr={(v) => set('descriptionTr', v)} onEn={(v) => set('descriptionEn', v)}
                multiline required
              />

              {/* Button text */}
              <BilingualRow
                label="Button text"
                langTab={ltButton} setLangTab={setLtButton}
                valueTr={form.buttonTextTr} valueEn={form.buttonTextEn}
                onTr={(v) => set('buttonTextTr', v)} onEn={(v) => set('buttonTextEn', v)}
                required
              />

              {/* Button link */}
              <div>
                <label className="label">Button link</label>
                <input required value={form.buttonLink} onChange={(e) => set('buttonLink', e.target.value)}
                  placeholder="/store/artist-slug" className="input" />
              </div>

              {/* Image URL */}
              <div>
                <label className="label">Image URL (optional)</label>
                <input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)}
                  placeholder="https://…" className="input" />
              </div>

              {/* Gradients */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Background gradient CSS</label>
                  <textarea value={form.gradient} onChange={(e) => set('gradient', e.target.value)}
                    rows={2} className="input resize-none font-mono text-xs" />
                </div>
                <div>
                  <label className="label">Button gradient CSS</label>
                  <textarea value={form.buttonGradient} onChange={(e) => set('buttonGradient', e.target.value)}
                    rows={2} className="input resize-none font-mono text-xs" />
                </div>
              </div>

              {/* Sort order + tenant */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Sort order</label>
                  <input type="number" value={form.sortOrder}
                    onChange={(e) => set('sortOrder', Number(e.target.value))} className="input" />
                </div>
                <div>
                  <label className="label">Tenant ID (optional)</label>
                  <input value={form.tenantId} onChange={(e) => set('tenantId', e.target.value)}
                    placeholder="leave blank for platform-wide" className="input" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary">
                  {isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
