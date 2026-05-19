'use client';

import { useState } from 'react';
import {
  useAdminCategories,
  useAdminCreateCategory,
  useAdminUpdateCategory,
  useAdminDeleteCategory,
  type Category,
} from '../../../../hooks/useCategories';

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // Turkish character mapping
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ı/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const EMPTY_FORM = { name: '', icon: '', slug: '', sortOrder: '0', active: true };

export default function AdminCategoriesPage() {
  const { data: categories = [], isLoading } = useAdminCategories();
  const createCategory = useAdminCreateCategory();
  const updateCategory = useAdminUpdateCategory();
  const deleteCategory = useAdminDeleteCategory();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      icon: cat.icon ?? '',
      slug: cat.slug,
      sortOrder: String(cat.sortOrder),
      active: cat.active,
    });
    setError('');
    setShowForm(true);
  }

  function handleNameChange(value: string) {
    setForm((f) => ({
      ...f,
      name: value,
      // Only auto-slug when creating new
      ...(editingId ? {} : { slug: slugify(value) }),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      icon: form.icon.trim() || undefined,
      sortOrder: Number(form.sortOrder),
      active: form.active,
    };

    try {
      if (editingId) {
        await updateCategory.mutateAsync({ id: editingId, ...payload });
      } else {
        await createCategory.mutateAsync(payload as any);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Something went wrong');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCategory.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to delete');
    }
  }

  async function handleToggleActive(cat: Category) {
    try {
      await updateCategory.mutateAsync({ id: cat.id, active: !cat.active });
    } catch {}
  }

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kategoriler</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{categories.length} kategori</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Yeni Kategori
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingId ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
          </h2>

          {error && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Ad *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="T-Shirt"
                  className="input"
                />
              </div>
              <div>
                <label className="label">
                  Emoji / İkon{' '}
                  <span className="text-gray-400 font-normal text-xs">(emoji klavyesi için Win+. / Cmd+Ctrl+Space)</span>
                </label>
                <input
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="👕"
                  className="input"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="label">Slug *</label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="t-shirt"
                  className="input font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">URL'de kullanılır, otomatik oluşturulur</p>
              </div>
              <div>
                <label className="label">Sıralama</label>
                <input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  className="input"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  form.active ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <label className="text-sm text-gray-700 dark:text-gray-300">
                {form.active ? 'Aktif' : 'Pasif'}
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="btn-ghost"
              >
                İptal
              </button>
              <button type="submit" disabled={isPending} className="btn-primary">
                {isPending ? 'Kaydediliyor…' : editingId ? 'Kaydet' : 'Oluştur'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p className="text-center py-16 text-gray-400">Yükleniyor…</p>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
          Henüz kategori yok
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3">İkon</th>
                <th className="text-left px-4 py-3">Ad</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-left px-4 py-3">Sıra</th>
                <th className="text-left px-4 py-3">Durum</th>
                <th className="text-right px-4 py-3">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr
                  key={cat.id}
                  className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/40"
                >
                  <td className="px-4 py-3 text-2xl">{cat.icon ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{cat.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{cat.slug}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{cat.sortOrder}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(cat)}
                      disabled={updateCategory.isPending}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                        cat.active
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {cat.active ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-xs border border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        Düzenle
                      </button>

                      {deleteConfirm === cat.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="text-xs text-red-600 border border-red-300 dark:border-red-800 px-2.5 py-1.5 rounded-lg"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs text-gray-500 px-2 py-1.5 rounded-lg"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(cat.id)}
                          className="text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
