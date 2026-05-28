'use client';

import { useState } from 'react';
import {
  useAdminCategories,
  useAdminCreateCategory,
  useAdminUpdateCategory,
  useAdminDeleteCategory,
  type Category,
} from '../../../../hooks/useCategories';
import { useAuthStore } from '../../../../store/auth.store';
import { useI18n } from '../../../../lib/i18n';

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
  const t = useI18n((s) => s.t);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');
  // Stage 3 schema editor (GOD_USER only)
  const [schemaFor, setSchemaFor] = useState<Category | null>(null);
  const currentUser = useAuthStore((s) => s.user);
  const isGod = currentUser?.role === 'GOD_USER';

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
      setError(err?.response?.data?.message ?? t('common.somethingWentWrong'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCategory.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('admin.categories.deleteFailed'));
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.categories.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{t('admin.categories.count').replace('{n}', String(categories.length))}</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          {t('admin.categories.new')}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingId ? t('admin.categories.edit') : t('admin.categories.new')}
          </h2>

          {error && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t('admin.categories.fieldName')}</label>
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
                  {t('admin.categories.fieldIcon')}{' '}
                  <span className="text-gray-400 font-normal text-xs">{t('admin.categories.fieldIconHint')}</span>
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
                <label className="label">{t('admin.categories.fieldSlug')}</label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="t-shirt"
                  className="input font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">{t('admin.categories.fieldSlugHint')}</p>
              </div>
              <div>
                <label className="label">{t('admin.categories.fieldOrder')}</label>
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
                {form.active ? t('admin.categories.active') : t('admin.categories.inactive')}
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="btn-ghost"
              >
                {t('admin.cancel')}
              </button>
              <button type="submit" disabled={isPending} className="btn-primary">
                {isPending ? t('admin.saving') : editingId ? t('admin.save') : t('admin.categories.create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p className="text-center py-16 text-gray-400">{t('admin.loading')}</p>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
          {t('admin.categories.empty')}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3">{t('admin.categories.colIcon')}</th>
                <th className="text-left px-4 py-3">{t('admin.categories.colName')}</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-left px-4 py-3">{t('admin.categories.colOrder')}</th>
                <th className="text-left px-4 py-3">{t('admin.categories.colStatus')}</th>
                <th className="text-right px-4 py-3">{t('admin.actions')}</th>
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
                      {cat.active ? t('admin.categories.active') : t('admin.categories.inactive')}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-xs border border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        {t('adminVendor.edit')}
                      </button>

                      {isGod && (
                        <button
                          onClick={() => setSchemaFor(cat)}
                          className={`text-xs border px-2.5 py-1.5 rounded-lg transition-colors ${
                            (cat as any).attributeSchema
                              ? 'border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-purple-400 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400'
                          }`}
                          title="Özellik şeması ve beden tablosu"
                        >
                          📋 Şema
                        </button>
                      )}

                      {deleteConfirm === cat.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="text-xs text-red-600 border border-red-300 dark:border-red-800 px-2.5 py-1.5 rounded-lg"
                          >
                            {t('admin.categories.confirm')}
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
                          {t('common.delete')}
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

      {schemaFor && (
        <SchemaModal
          category={categories.find((c) => c.id === schemaFor.id) ?? schemaFor}
          onClose={() => setSchemaFor(null)}
        />
      )}
    </div>
  );
}

// ─── Stage 3: Schema editor modal (GOD_USER only) ────────────────────────────

function SchemaModal({ category, onClose }: { category: Category; onClose: () => void }) {
  const update = useAdminUpdateCategory();
  const [schemaText, setSchemaText] = useState(
    JSON.stringify((category as any).attributeSchema ?? { fields: [] }, null, 2),
  );
  const [chartText, setChartText] = useState(
    (category as any).sizeChartTemplate
      ? JSON.stringify((category as any).sizeChartTemplate, null, 2)
      : '',
  );
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError('');
    let parsedSchema: any = null;
    let parsedChart: any = null;
    try {
      parsedSchema = JSON.parse(schemaText);
      if (!parsedSchema || !Array.isArray(parsedSchema.fields)) {
        throw new Error('attributeSchema must be { "fields": [...] }');
      }
    } catch (e: any) {
      setError(`attributeSchema JSON hatası: ${e.message}`);
      return;
    }
    if (chartText.trim()) {
      try {
        parsedChart = JSON.parse(chartText);
      } catch (e: any) {
        setError(`sizeChartTemplate JSON hatası: ${e.message}`);
        return;
      }
    }
    try {
      await update.mutateAsync({
        id: category.id,
        attributeSchema:   parsedSchema,
        sizeChartTemplate: parsedChart,
      } as any);
      setSaved(true);
      setTimeout(onClose, 800);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Kaydedilemedi');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-3xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Şema — {category.icon} {category.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Bu kategorideki ürünlerin özellik formunu ve beden tablosunu kontrol eder.
              JSON formatı: <code className="font-mono">{`{ fields: [{ key, label: {tr,en}, type, options?, required? }] }`}</code>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl leading-none">×</button>
        </div>

        {error && <div className="rounded-lg bg-red-900/30 border border-red-700 px-3 py-2 text-sm text-red-200">{error}</div>}
        {saved && <div className="rounded-lg bg-green-900/30 border border-green-700 px-3 py-2 text-sm text-green-200">Kaydedildi.</div>}

        <div>
          <label className="label">attributeSchema (JSON)</label>
          <textarea
            className="input font-mono text-xs w-full"
            rows={14}
            value={schemaText}
            onChange={(e) => setSchemaText(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div>
          <label className="label">sizeChartTemplate (JSON, optional)</label>
          <textarea
            className="input font-mono text-xs w-full"
            rows={10}
            value={chartText}
            onChange={(e) => setChartText(e.target.value)}
            placeholder='{"unit":"cm","measurements":[...],"sizes":[...]}'
            spellCheck={false}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">İptal</button>
          <button onClick={handleSave} disabled={update.isPending} className="btn-primary">
            {update.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
