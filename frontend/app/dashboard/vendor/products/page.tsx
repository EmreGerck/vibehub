'use client';

import { useState } from 'react';
import { usePageSize } from '../../../../hooks/usePageSize';
import { PageSizeSelector } from '../../../../components/ui/PageSizeSelector';
import { useAuthStore } from '../../../../store/auth.store';
import { useProducts, useCreateProduct, useSubmitProduct } from '../../../../hooks/useProducts';
import { useCan } from '../../../../hooks/usePermissions';
import { useI18n } from '../../../../lib/i18n';
import { formatPrice } from '../../../../lib/format';
import { useCategories } from '../../../../hooks/useCategories';
import type { Product } from '../../../../types';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'badge-gray',
  PENDING_REVIEW: 'badge-yellow',
  LIVE: 'badge-green',
  ARCHIVED: 'badge-red',
};

export default function VendorProductsPage() {
  const t = useI18n((s) => s.t);
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [pageSize, setPageSize] = usePageSize('vendor-products', 50);

  const { data, isLoading } = useProducts({ tenantId: user?.tenantId ?? '', limit: pageSize });
  const createProduct = useCreateProduct();
  const submitProduct = useSubmitProduct();
  const can = useCan();
  const canCreate = can('PRODUCT_CREATE');
  const canSubmit = can('PRODUCT_SUBMIT');
  const canPublishDirect = can('PRODUCT_PUBLISH_DIRECT');

  const { data: categories = [] } = useCategories();
  const [form, setForm] = useState({ title: '', description: '', price: '', currency: 'TRY', tags: '', categoryId: '', shippingNote: '' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    try {
      await createProduct.mutateAsync({
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        currency: form.currency,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        categoryId: form.categoryId || undefined,
        shippingNote: form.shippingNote || undefined,
      });
      setForm({ title: '', description: '', price: '', currency: 'TRY', tags: '', categoryId: '', shippingNote: '' });
      setShowForm(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Failed to create product');
    }
  }

  async function handleSubmit(productId: string) {
    try { await submitProduct.mutateAsync(productId); } catch {}
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('vendor.products')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{data?.total ?? 0} {t('admin.total')}</p>
        </div>
        <div className="flex items-center gap-3">
          <PageSizeSelector value={pageSize} onChange={setPageSize} options={[10, 25, 50, 100]} />
          {canCreate ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary"
            >
              {showForm ? t('admin.cancel') : t('vendor.newProduct')}
            </button>
          ) : (
            <span
              className="text-xs text-gray-500 dark:text-gray-400 italic"
              title={t('perm.revokedNote')}
            >
              {t('perm.creationDisabled')}
            </span>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{t('vendor.createProduct')}</h2>
          {formError && <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">{t('vendor.productTitle')}</label>
              <input
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input"
              />
            </div>
            <div className="col-span-2">
              <label className="label">{t('vendor.description')}</label>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input resize-none"
              />
            </div>
            <div>
              <label className="label">{t('vendor.basePrice')}</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t('vendor.currency')}</label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="input"
              >
                <option>TRY</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">{t('vendor.tags')}</label>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder={t('vendor.tagsPlaceholder')}
                className="input"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Kategori</label>
              <select
                value={form.categoryId}
                onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className="input"
              >
                <option value="">Category / Kategori (optional)</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.nameEn ? `${cat.nameEn} / ${cat.name}` : cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">🚚 Kargo Süresi / Açıklaması</label>
              <input
                value={form.shippingNote}
                onChange={e => setForm(f => ({ ...f, shippingNote: e.target.value }))}
                placeholder="Örn: 3-5 iş günü içinde DHL ile kargoya verilir"
                className="input"
                maxLength={300}
              />
              <p className="text-xs text-gray-400 mt-1">Ürün sayfasında ve sepette gösterilir. Ürüne özel kargo bilgisi ekleyin.</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">{t('vendor.createNote')}</p>

          <button
            type="submit"
            disabled={createProduct.isPending}
            className="btn-primary"
          >
            {createProduct.isPending ? t('vendor.creating') : t('vendor.createProduct')}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : data?.items.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">{t('vendor.noProducts')}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-5 py-3">{t('vendor.product')}</th>
                <th className="text-left px-5 py-3">{t('vendor.price')}</th>
                <th className="text-left px-5 py-3">{t('admin.status')}</th>
                <th className="text-left px-5 py-3">{t('vendor.variants')}</th>
                <th className="text-left px-5 py-3">{t('vendor.action')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((product: Product) => (
                <tr key={product.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{product.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{product.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-5 py-3 text-gray-900 dark:text-white">
                    {formatPrice(product.price)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[product.status] ?? 'badge-gray'}`}>
                      {product.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                    {(product.variants?.length ?? 0)} {t('admin.variants')}
                  </td>
                  <td className="px-5 py-3">
                    {product.status === 'DRAFT' && canSubmit && (
                      <button
                        onClick={() => handleSubmit(product.id)}
                        disabled={submitProduct.isPending}
                        className="text-xs bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-800/60 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                        title={canPublishDirect ? t('perm.publishHint') : undefined}
                      >
                        {canPublishDirect ? t('perm.publishLabel') : t('vendor.submitForReview')}
                      </button>
                    )}
                    {product.status === 'DRAFT' && !canSubmit && (
                      <span className="text-xs text-gray-500 italic" title={t('perm.revokedNote')}>
                        {t('perm.submitDisabled')}
                      </span>
                    )}
                    {product.status === 'PENDING_REVIEW' && (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400">{t('vendor.underReview')}</span>
                    )}
                    {product.status === 'LIVE' && (
                      <span className="text-xs text-green-600 dark:text-green-400">{t('vendor.published')}</span>
                    )}
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
