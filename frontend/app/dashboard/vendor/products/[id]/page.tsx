'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useProduct,
  useUpdateProduct,
  useSubmitProduct,
  useArchiveProduct,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  useAdjustStock,
  useUploadImage,
} from '../../../../../hooks/useProducts';
import { useCan } from '../../../../../hooks/usePermissions';
import { useCategories } from '../../../../../hooks/useCategories';
import { useI18n } from '../../../../../lib/i18n';
import { formatPrice } from '../../../../../lib/format';
import { toast } from '../../../../../store/toast.store';
import { ConfirmModal } from '../../../../../components/ui/ConfirmModal';
import type { ProductVariant } from '../../../../../types';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'badge-gray',
  PENDING_REVIEW: 'badge-yellow',
  LIVE: 'badge-green',
  ARCHIVED: 'badge-red',
};

function parseAttributes(input: string): Record<string, string> {
  const out: Record<string, string> = {};
  input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [k, ...rest] = pair.split(':');
      if (k && rest.length) out[k.trim()] = rest.join(':').trim();
    });
  return out;
}

function attributesToString(attrs: Record<string, string> | undefined): string {
  if (!attrs) return '';
  return Object.entries(attrs)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
}

export default function VendorProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? '';
  const t = useI18n((s) => s.t);

  const { data: product, isLoading, error } = useProduct(id);
  const { data: categories = [] } = useCategories();

  const can = useCan();
  const canEdit = can('PRODUCT_EDIT');
  const canSubmit = can('PRODUCT_SUBMIT');
  const canArchive = can('PRODUCT_DELETE');
  const canVariant = can('VARIANT_MANAGE');
  const canStock = can('INVENTORY_EDIT');

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateProduct = useUpdateProduct();
  const submitProduct = useSubmitProduct();
  const archiveProduct = useArchiveProduct();
  const createVariant = useCreateVariant(id);
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();
  const adjustStock = useAdjustStock();
  const uploadImage = useUploadImage();

  // ── Local form state for basic info ───────────────────────────────────────
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    tags: '',
    categoryId: '',
    shippingNote: '',
  });
  const [images, setImages] = useState<string[]>([]);
  // Stage 3 — structured attribute values keyed by Category.attributeSchema.
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reload form when product loads
  useEffect(() => {
    if (!product) return;
    setForm({
      title: product.title ?? '',
      description: product.description ?? '',
      price: String(product.price ?? ''),
      tags: (product.tags ?? []).join(', '),
      categoryId: product.categoryId ?? '',
      shippingNote: product.shippingNote ?? '',
    });
    setImages(product.images ?? []);
    setAttributes(((product as any).attributes as Record<string, any>) ?? {});
  }, [product]);

  const isEditableStatus = product?.status === 'DRAFT' || product?.status === 'ARCHIVED';
  const editLocked = !isEditableStatus;

  // ── Variant inline-create form state ──────────────────────────────────────
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [variantForm, setVariantForm] = useState({
    sku: '',
    attributes: '',
    priceOverride: '',
    stockQty: '',
    lowStockThreshold: '5',
  });

  // ── Variant inline edit ───────────────────────────────────────────────────
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVariantForm, setEditVariantForm] = useState({
    priceOverride: '',
    stockQty: '',
    lowStockThreshold: '',
  });

  // ── Stock adjustment input state (per variant) ────────────────────────────
  const [stockDeltaMap, setStockDeltaMap] = useState<Record<string, string>>({});

  // ── Archive confirmation ──────────────────────────────────────────────────
  const [archiveOpen, setArchiveOpen] = useState(false);

  // ── Delete variant confirmation ───────────────────────────────────────────
  const [deletingVariant, setDeletingVariant] = useState<ProductVariant | null>(null);

  const variants = product?.variants ?? [];

  const variantById = useMemo(() => {
    const map = new Map<string, ProductVariant>();
    variants.forEach((v) => map.set(v.id, v));
    return map;
  }, [variants]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSaveBasic(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        categoryId: form.categoryId || undefined,
        shippingNote: form.shippingNote || undefined,
        // Send the cleaned attributes — strip empty strings/null so we don't
        // pollute the JSON column with noise. Boolean false is meaningful, keep it.
        attributes: Object.fromEntries(
          Object.entries(attributes).filter(([, v]) => v !== '' && v !== null && v !== undefined),
        ),
      });
      toast('success', t('vendor.saved'));
    } catch (err: any) {
      toast('error', err?.response?.data?.message ?? 'Save failed');
    }
  }

  async function handleSaveImages(newImages: string[]) {
    if (!product) return;
    try {
      await updateProduct.mutateAsync({ id: product.id, images: newImages });
      setImages(newImages);
      toast('success', t('vendor.saved'));
    } catch (err: any) {
      toast('error', err?.response?.data?.message ?? 'Failed');
    }
  }

  async function handleRemoveImage(idx: number) {
    const next = images.filter((_, i) => i !== idx);
    await handleSaveImages(next);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !product) return;
    try {
      const result = await uploadImage.mutateAsync({ file, folder: 'products' });
      const next = [...images, result.url];
      await handleSaveImages(next);
    } catch (err: any) {
      toast('error', err?.response?.data?.message ?? 'Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmitForReview() {
    if (!product) return;
    try {
      await submitProduct.mutateAsync(product.id);
      toast('success', t('vendor.saved'));
    } catch (err: any) {
      toast('error', err?.response?.data?.message ?? 'Failed');
    }
  }

  async function handleArchive() {
    if (!product) return;
    try {
      await archiveProduct.mutateAsync(product.id);
      toast('success', t('vendor.saved'));
      setArchiveOpen(false);
    } catch (err: any) {
      toast('error', err?.response?.data?.message ?? 'Failed');
    }
  }

  async function handleCreateVariant(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createVariant.mutateAsync({
        sku: variantForm.sku.trim(),
        attributes: parseAttributes(variantForm.attributes),
        priceOverride: variantForm.priceOverride ? parseFloat(variantForm.priceOverride) : undefined,
        stockQty: parseInt(variantForm.stockQty, 10) || 0,
        lowStockThreshold: variantForm.lowStockThreshold
          ? parseInt(variantForm.lowStockThreshold, 10)
          : undefined,
      });
      toast('success', t('vendor.saved'));
      setVariantForm({ sku: '', attributes: '', priceOverride: '', stockQty: '', lowStockThreshold: '5' });
      setShowVariantForm(false);
    } catch (err: any) {
      toast('error', err?.response?.data?.message ?? 'Failed');
    }
  }

  function startEditVariant(v: ProductVariant) {
    setEditingVariantId(v.id);
    setEditVariantForm({
      priceOverride: v.priceOverride !== null ? String(v.priceOverride) : '',
      stockQty: String(v.stockQty),
      lowStockThreshold: String(v.lowStockThreshold),
    });
  }

  async function handleSaveVariantEdit(variantId: string) {
    try {
      await updateVariant.mutateAsync({
        variantId,
        priceOverride: editVariantForm.priceOverride ? parseFloat(editVariantForm.priceOverride) : undefined,
        stockQty: editVariantForm.stockQty !== '' ? parseInt(editVariantForm.stockQty, 10) : undefined,
        lowStockThreshold: editVariantForm.lowStockThreshold !== ''
          ? parseInt(editVariantForm.lowStockThreshold, 10)
          : undefined,
      });
      toast('success', t('vendor.saved'));
      setEditingVariantId(null);
    } catch (err: any) {
      toast('error', err?.response?.data?.message ?? 'Failed');
    }
  }

  async function handleConfirmDeleteVariant() {
    if (!deletingVariant || !product) return;
    try {
      await deleteVariant.mutateAsync({ variantId: deletingVariant.id, productId: product.id });
      toast('success', t('vendor.saved'));
      setDeletingVariant(null);
    } catch (err: any) {
      toast('error', err?.response?.data?.message ?? 'Failed');
    }
  }

  async function handleAdjustStock(variantId: string, delta: number) {
    if (!delta) return;
    try {
      await adjustStock.mutateAsync({ variantId, delta });
      toast('success', t('vendor.saved'));
      setStockDeltaMap((m) => ({ ...m, [variantId]: '' }));
    } catch (err: any) {
      toast('error', err?.response?.data?.message ?? 'Failed');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <div className="p-6 md:p-8 text-gray-400">{t('admin.loading')}</div>;
  }

  if (error || !product) {
    return (
      <div className="p-6 md:p-8">
        <Link href="/dashboard/vendor/products" className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
          {t('vendor.back')}
        </Link>
        <p className="mt-4 text-gray-500 dark:text-gray-400">{t('vendor.productNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard/vendor/products"
            className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
          >
            {t('vendor.back')}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{product.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[product.status] ?? 'badge-gray'}`}>
              {product.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400 font-mono">{product.id.slice(0, 8)}…</span>
          </div>
        </div>
        {product.status === 'DRAFT' && canSubmit && (
          <button
            onClick={handleSubmitForReview}
            disabled={submitProduct.isPending}
            className="btn-primary"
          >
            {submitProduct.isPending ? t('vendor.saving') : t('vendor.submitForReviewBtn')}
          </button>
        )}
      </div>

      {/* ── Edit-lock notice ─────────────────────────────────────────────── */}
      {editLocked && canEdit && (
        <div className="card p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-200">
          {t('vendor.requiresArchive')}
        </div>
      )}

      {/* ── Basic Info ───────────────────────────────────────────────────── */}
      {canEdit && (
        <form onSubmit={handleSaveBasic} className="card p-6 space-y-4">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{t('vendor.basicInfo')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">{t('vendor.productTitle')}</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="input"
                disabled={editLocked}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="label">{t('vendor.description')}</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="input resize-none"
                disabled={editLocked}
                required
              />
            </div>
            <div>
              <label className="label">{t('vendor.basePrice')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="input"
                disabled={editLocked}
                required
              />
            </div>
            <div>
              <label className="label">{t('vendor.currency')}</label>
              <input value={product.currency} disabled className="input opacity-60" />
            </div>
            <div className="col-span-2">
              <label className="label">{t('vendor.tags')}</label>
              <input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder={t('vendor.tagsPlaceholder')}
                className="input"
                disabled={editLocked}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Kategori</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="input"
                disabled={editLocked}
              >
                <option value="">—</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon ? `${cat.icon} ` : ''}
                    {cat.nameEn ? `${cat.nameEn} / ${cat.name}` : cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">{t('vendor.shipment.notes')}</label>
              <input
                value={form.shippingNote}
                onChange={(e) => setForm((f) => ({ ...f, shippingNote: e.target.value }))}
                className="input"
                maxLength={300}
                disabled={editLocked}
              />
            </div>
          </div>

          {/* Stage 3: dynamic spec form driven by the selected category's schema */}
          <CategoryAttributeFields
            category={categories.find((c: any) => c.id === form.categoryId)}
            values={attributes}
            onChange={setAttributes}
            disabled={editLocked}
          />

          <button
            type="submit"
            disabled={editLocked || updateProduct.isPending}
            className="btn-primary"
          >
            {updateProduct.isPending ? t('vendor.saving') : t('vendor.saveChanges')}
          </button>
        </form>
      )}

      {/* ── Images ───────────────────────────────────────────────────────── */}
      {canEdit && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{t('vendor.images')}</h2>

          {images.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {/* fall back to a sensible message */}
              {t('vendor.uploadHint')}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((url, idx) => (
                <div key={`${url}-${idx}`} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {!editLocked && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 px-2 py-0.5 text-xs rounded bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('vendor.removeImage')}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              onChange={handleFileUpload}
              disabled={editLocked || uploadImage.isPending}
              className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer"
            />
            <p className="mt-2 text-xs text-gray-400">{t('vendor.uploadHint')}</p>
            {uploadImage.isPending && (
              <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">{t('vendor.uploading')}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Variants ─────────────────────────────────────────────────────── */}
      {canVariant && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{t('vendor.variants')}</h2>
            <button
              type="button"
              onClick={() => setShowVariantForm((v) => !v)}
              className="btn-ghost text-sm"
              disabled={editLocked}
            >
              {showVariantForm ? t('vendor.cancel') : t('vendor.addVariant')}
            </button>
          </div>

          {showVariantForm && (
            <form
              onSubmit={handleCreateVariant}
              className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50"
            >
              <div>
                <label className="label">{t('vendor.sku')}</label>
                <input
                  required
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm((f) => ({ ...f, sku: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('vendor.attributes')}</label>
                <input
                  value={variantForm.attributes}
                  onChange={(e) => setVariantForm((f) => ({ ...f, attributes: e.target.value }))}
                  placeholder={t('vendor.attributesPlaceholder')}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('vendor.priceOverride')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={variantForm.priceOverride}
                  onChange={(e) => setVariantForm((f) => ({ ...f, priceOverride: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('vendor.stockQty')}</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={variantForm.stockQty}
                  onChange={(e) => setVariantForm((f) => ({ ...f, stockQty: e.target.value }))}
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="label">{t('vendor.lowStockThreshold')}</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={variantForm.lowStockThreshold}
                  onChange={(e) => setVariantForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <button type="submit" disabled={createVariant.isPending} className="btn-primary">
                  {createVariant.isPending ? t('vendor.saving') : t('vendor.addVariant')}
                </button>
              </div>
            </form>
          )}

          {variants.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('vendor.noVariants')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left px-3 py-2">{t('vendor.sku')}</th>
                    <th className="text-left px-3 py-2">{t('vendor.attributes')}</th>
                    <th className="text-left px-3 py-2">{t('vendor.price')}</th>
                    <th className="text-left px-3 py-2">{t('vendor.stockQty')}</th>
                    <th className="text-left px-3 py-2">{t('vendor.lowStockThreshold')}</th>
                    <th className="text-right px-3 py-2">{t('vendor.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => {
                    const isEditing = editingVariantId === v.id;
                    return (
                      <tr key={v.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                        <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{v.sku}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{attributesToString(v.attributes) || '—'}</td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editVariantForm.priceOverride}
                              onChange={(e) => setEditVariantForm((f) => ({ ...f, priceOverride: e.target.value }))}
                              className="input py-1 text-xs w-24"
                              placeholder="—"
                            />
                          ) : v.priceOverride !== null ? (
                            formatPrice(v.priceOverride)
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={editVariantForm.stockQty}
                              onChange={(e) => setEditVariantForm((f) => ({ ...f, stockQty: e.target.value }))}
                              className="input py-1 text-xs w-20"
                            />
                          ) : (
                            <span className={v.stockQty <= v.lowStockThreshold ? 'text-yellow-600 dark:text-yellow-400 font-medium' : 'text-gray-900 dark:text-white'}>
                              {v.stockQty}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={editVariantForm.lowStockThreshold}
                              onChange={(e) => setEditVariantForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
                              className="input py-1 text-xs w-20"
                            />
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">{v.lowStockThreshold}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveVariantEdit(v.id)}
                                disabled={updateVariant.isPending}
                                className="text-xs px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                              >
                                {t('vendor.saveChanges')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingVariantId(null)}
                                className="text-xs px-2 py-1 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                {t('vendor.cancel')}
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEditVariant(v)}
                                className="text-xs px-2 py-1 rounded text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                              >
                                {t('vendor.edit')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingVariant(v)}
                                disabled={editLocked}
                                className="text-xs px-2 py-1 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-40 disabled:hover:bg-transparent"
                              >
                                {t('vendor.delete')}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Stock adjustments ────────────────────────────────────────────── */}
      {canStock && variants.length > 0 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{t('vendor.stock')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            +/- veya delta gir.
          </p>
          <div className="space-y-2">
            {variants.map((v) => {
              const delta = stockDeltaMap[v.id] ?? '';
              const parsedDelta = parseInt(delta, 10);
              const validDelta = !isNaN(parsedDelta) && parsedDelta !== 0;
              const current = variantById.get(v.id)?.stockQty ?? v.stockQty;
              return (
                <div key={v.id} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{v.sku}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{attributesToString(v.attributes) || '—'}</p>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t('vendor.stockQty')}: <span className="font-semibold text-gray-900 dark:text-white">{current}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleAdjustStock(v.id, -1)}
                      disabled={adjustStock.isPending}
                      className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm disabled:opacity-50"
                    >
                      −1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustStock(v.id, 1)}
                      disabled={adjustStock.isPending}
                      className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm disabled:opacity-50"
                    >
                      +1
                    </button>
                    <input
                      type="number"
                      step="1"
                      placeholder="Δ"
                      value={delta}
                      onChange={(e) => setStockDeltaMap((m) => ({ ...m, [v.id]: e.target.value }))}
                      className="input py-1 text-xs w-20"
                    />
                    <button
                      type="button"
                      onClick={() => handleAdjustStock(v.id, parsedDelta)}
                      disabled={!validDelta || adjustStock.isPending}
                      className="text-xs px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40"
                    >
                      {adjustStock.isPending ? t('vendor.adjustingStock') : t('vendor.adjustStock')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Danger zone ──────────────────────────────────────────────────── */}
      {canArchive && product.status !== 'ARCHIVED' && (
        <div className="card p-6 border-red-200 dark:border-red-900/50 space-y-3">
          <h2 className="font-semibold text-lg text-red-600 dark:text-red-400">{t('vendor.dangerZone')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('vendor.archiveConfirm')}</p>
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            {t('vendor.archiveProduct')}
          </button>
        </div>
      )}

      <ConfirmModal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchive}
        title={t('vendor.archiveProduct')}
        description={t('vendor.archiveConfirm')}
        confirmPhrase={product.title}
        confirmLabel={t('vendor.archiveProduct')}
        cancelLabel={t('vendor.cancel')}
        danger="critical"
        busy={archiveProduct.isPending}
      />

      <ConfirmModal
        open={!!deletingVariant}
        onClose={() => setDeletingVariant(null)}
        onConfirm={handleConfirmDeleteVariant}
        title={t('vendor.deleteVariant')}
        description={
          deletingVariant
            ? `${deletingVariant.sku} — ${attributesToString(deletingVariant.attributes) || '—'}`
            : ''
        }
        confirmLabel={t('vendor.delete')}
        cancelLabel={t('vendor.cancel')}
        danger="critical"
        busy={deleteVariant.isPending}
      />
    </div>
  );
}

// ─── Stage 3: dynamic attribute form per category schema ──────────────────────

function CategoryAttributeFields({
  category,
  values,
  onChange,
  disabled,
}: {
  category: any | undefined;
  values: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  disabled?: boolean;
}) {
  const t      = useI18n((s) => s.t);
  const locale = useI18n((s) => s.locale);

  const fields: any[] = category?.attributeSchema?.fields ?? [];
  if (!category || fields.length === 0) return null;

  function set(key: string, val: any) {
    onChange({ ...values, [key]: val });
  }

  const pickLabel = (l: { tr: string; en: string } | undefined) =>
    l ? l[locale as 'tr' | 'en'] || l.tr || l.en || '' : '';

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 pt-5 mt-2 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('pdp.specs')}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {category.icon ? `${category.icon} ` : ''}{category.name} kategorisi için tanımlı özellikler. Doldurman alıcılarının doğru kararı vermesine yardım eder.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => {
          const val = values[f.key];
          const label = (
            <label className="label">
              {pickLabel(f.label)}{f.required && <span className="text-red-500"> *</span>}
            </label>
          );
          if (f.type === 'select' && Array.isArray(f.options)) {
            return (
              <div key={f.key}>
                {label}
                <select
                  className="input w-full"
                  value={val ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  disabled={disabled}
                >
                  <option value="">—</option>
                  {f.options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            );
          }
          if (f.type === 'boolean') {
            return (
              <label key={f.key} className="flex items-center gap-2 mt-7 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(val)}
                  onChange={(e) => set(f.key, e.target.checked)}
                  disabled={disabled}
                  className="rounded border-surface-border bg-transparent"
                />
                <span className="text-sm text-gray-300">
                  {pickLabel(f.label)}{f.required && <span className="text-red-500"> *</span>}
                </span>
              </label>
            );
          }
          // Default = text
          return (
            <div key={f.key}>
              {label}
              <input
                type="text"
                className="input w-full"
                value={val ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
                disabled={disabled}
                maxLength={200}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
