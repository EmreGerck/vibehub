'use client';

import { useState } from 'react';
import { usePageSize } from '../../../../hooks/usePageSize';
import { PageSizeSelector } from '../../../../components/ui/PageSizeSelector';
import {
  useAdminAllProducts,
  useAdminPendingProducts,
  useAdminCreateProduct,
  useAdminUpdateProduct,
  useAdminPublishProduct,
  useAdminUnpublishProduct,
  useAdminDeleteProduct,
  useAdminCreateVariant,
  useAdminUpdateVariant,
  useAdminDeleteVariant,
} from '../../../../hooks/useAdmin';
import { useReviewProduct } from '../../../../hooks/useProducts';
import { useAdminVendors } from '../../../../hooks/useAdmin';
import { useCategories } from '../../../../hooks/useCategories';
import { formatPrice } from '../../../../lib/format';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'all' | 'pending';
type LangTab = 'tr' | 'en';

interface ProductFormState {
  tenantId: string;
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  price: string;
  currency: string;
  tags: string;
  images: string;
  previewVideoUrl: string;
  categoryId: string;
  isPreOrder: boolean;
  preOrderShipDate: string;
  preOrderEndsAt: string;
  preOrderLimit: string;
}

const EMPTY_FORM: ProductFormState = {
  tenantId: '',
  titleTr: '',
  titleEn: '',
  descriptionTr: '',
  descriptionEn: '',
  price: '',
  currency: 'TRY',
  tags: '',
  images: '',
  previewVideoUrl: '',
  categoryId: '',
  isPreOrder: false,
  preOrderShipDate: '',
  preOrderEndsAt: '',
  preOrderLimit: '',
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-gray',
  PENDING_REVIEW: 'badge-yellow',
  LIVE: 'badge-green',
  ARCHIVED: 'badge-red',
};

// ── Bilingual Field Group ─────────────────────────────────────────────────────

function BilingualFields({
  langTab,
  setLangTab,
  label,
  fieldTr,
  fieldEn,
  onChangeTr,
  onChangeEn,
  multiline = false,
  required = false,
}: {
  langTab: LangTab;
  setLangTab: (l: LangTab) => void;
  label: string;
  fieldTr: string;
  fieldEn: string;
  onChangeTr: (v: string) => void;
  onChangeEn: (v: string) => void;
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
          <textarea
            required={required}
            rows={3}
            value={fieldTr}
            onChange={(e) => onChangeTr(e.target.value)}
            placeholder="Türkçe (zorunlu)"
            className="input resize-none"
          />
        ) : (
          <input
            required={required}
            value={fieldTr}
            onChange={(e) => onChangeTr(e.target.value)}
            placeholder="Türkçe (zorunlu)"
            className="input"
          />
        )
      ) : multiline ? (
        <textarea
          rows={3}
          value={fieldEn}
          onChange={(e) => onChangeEn(e.target.value)}
          placeholder="English (optional — falls back to Turkish if empty)"
          className="input resize-none"
        />
      ) : (
        <input
          value={fieldEn}
          onChange={(e) => onChangeEn(e.target.value)}
          placeholder="English (optional — falls back to Turkish if empty)"
          className="input"
        />
      )}
    </div>
  );
}

// ── Variant Manager Modal ─────────────────────────────────────────────────────

function VariantsModal({ product, onClose }: { product: any; onClose: () => void }) {
  const createVariant = useAdminCreateVariant();
  const updateVariant = useAdminUpdateVariant();
  const deleteVariant = useAdminDeleteVariant();
  const refresh = useAdminAllProducts({ limit: 1, search: product.id });
  const variants = product.variants ?? [];

  const [form, setForm] = useState({
    sku: '',
    color: '',
    size: '',
    stockQty: '10',
    priceOverride: '',
    lowStockThreshold: '5',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ stockQty: '', priceOverride: '', lowStockThreshold: '' });
  const [error, setError] = useState('');

  function startEdit(v: any) {
    setEditingId(v.id);
    setEditForm({
      stockQty: String(v.stockQty),
      priceOverride: v.priceOverride !== null && v.priceOverride !== undefined ? String(v.priceOverride) : '',
      lowStockThreshold: String(v.lowStockThreshold),
    });
  }

  async function saveEdit(v: any) {
    setError('');
    try {
      await updateVariant.mutateAsync({
        variantId: v.id,
        stockQty: Number(editForm.stockQty),
        priceOverride: editForm.priceOverride ? Number(editForm.priceOverride) : null,
        lowStockThreshold: Number(editForm.lowStockThreshold),
      });
      setEditingId(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save variant');
    }
  }

  async function remove(v: any) {
    setError('');
    try {
      await deleteVariant.mutateAsync(v.id);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to delete variant');
    }
  }

  async function addVariant(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const attrs: Record<string, string> = {};
    if (form.color.trim()) attrs.color = form.color.trim();
    if (form.size.trim()) attrs.size = form.size.trim();
    try {
      await createVariant.mutateAsync({
        productId: product.id,
        sku: form.sku.trim(),
        attributes: attrs,
        stockQty: Number(form.stockQty),
        priceOverride: form.priceOverride ? Number(form.priceOverride) : undefined,
        lowStockThreshold: Number(form.lowStockThreshold) || 5,
      });
      setForm({ sku: '', color: '', size: '', stockQty: '10', priceOverride: '', lowStockThreshold: '5' });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create variant');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-3xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Variants — {product.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              At least one variant is required before a product can be added to a cart.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl leading-none">×</button>
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

        {variants.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No variants yet — add one below.</p>
        ) : (
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-3 py-2">SKU</th>
                  <th className="text-left px-3 py-2">Attrs</th>
                  <th className="text-left px-3 py-2">Stock</th>
                  <th className="text-left px-3 py-2">Override price</th>
                  <th className="text-left px-3 py-2">Low-stock</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v: any) => {
                  const isEditing = editingId === v.id;
                  return (
                    <tr key={v.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{v.sku}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {Object.entries(v.attributes ?? {}).map(([k, val]) => `${k}=${val}`).join(' / ') || '—'}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input type="number" min="0" value={editForm.stockQty} onChange={(e) => setEditForm((f) => ({ ...f, stockQty: e.target.value }))} className="input w-20 px-2 py-1 text-xs" />
                        ) : (
                          <span className={Number(v.stockQty) <= Number(v.lowStockThreshold) ? 'text-amber-600 dark:text-amber-400' : ''}>{v.stockQty}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input type="number" step="0.01" value={editForm.priceOverride} onChange={(e) => setEditForm((f) => ({ ...f, priceOverride: e.target.value }))} placeholder="—" className="input w-24 px-2 py-1 text-xs" />
                        ) : (
                          v.priceOverride !== null && v.priceOverride !== undefined ? formatPrice(v.priceOverride) : '—'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input type="number" min="0" value={editForm.lowStockThreshold} onChange={(e) => setEditForm((f) => ({ ...f, lowStockThreshold: e.target.value }))} className="input w-16 px-2 py-1 text-xs" />
                        ) : (
                          v.lowStockThreshold
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={() => saveEdit(v)} disabled={updateVariant.isPending} className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg">Save</button>
                              <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 px-2 py-1">×</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(v)} className="text-xs text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 px-2.5 py-1">Edit</button>
                              <button onClick={() => remove(v)} disabled={deleteVariant.isPending} className="text-xs text-red-600 dark:text-red-400 hover:underline px-2.5 py-1">Delete</button>
                            </>
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

        <form onSubmit={addVariant} className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Add variant</h4>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">SKU *</label>
              <input required value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="tshirt-blk-m" className="input font-mono text-xs" />
            </div>
            <div>
              <label className="label">Color</label>
              <input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="Black" className="input" />
            </div>
            <div>
              <label className="label">Size</label>
              <input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="M" className="input" />
            </div>
            <div>
              <label className="label">Stock qty *</label>
              <input required type="number" min="0" value={form.stockQty} onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Override price</label>
              <input type="number" step="0.01" value={form.priceOverride} onChange={(e) => setForm((f) => ({ ...f, priceOverride: e.target.value }))} placeholder="(uses product price)" className="input" />
            </div>
            <div>
              <label className="label">Low-stock threshold</label>
              <input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))} className="input" />
            </div>
          </div>
          <button type="submit" disabled={createVariant.isPending} className="btn-primary text-sm">
            {createVariant.isPending ? 'Adding…' : '+ Add variant'}
          </button>
        </form>

        <div className="pt-2 text-right">
          <button onClick={onClose} className="btn-ghost text-sm">Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Product Form Modal ────────────────────────────────────────────────────────

function ProductFormModal({
  editingProduct,
  onClose,
}: {
  editingProduct: any | null;
  onClose: () => void;
}) {
  const createProduct = useAdminCreateProduct();
  const updateProduct = useAdminUpdateProduct();
  // Fetch vendors inside the modal so it always loads fresh when opened
  const { data: vendorsData, isLoading: vendorsLoading } = useAdminVendors({ limit: 100 });
  const { data: categories = [] } = useCategories();
  const vendors = vendorsData?.items ?? [];

  const [langTabTitle, setLangTabTitle] = useState<LangTab>('tr');
  const [langTabDesc, setLangTabDesc] = useState<LangTab>('tr');
  const [error, setError] = useState('');

  const existingTranslations = (editingProduct?.translations as any)?.en ?? {};

  const [form, setForm] = useState<ProductFormState>(() =>
    editingProduct
      ? {
          tenantId: editingProduct.tenant?.id ?? '',
          titleTr: editingProduct.title ?? '',
          titleEn: existingTranslations.title ?? '',
          descriptionTr: editingProduct.description ?? '',
          descriptionEn: existingTranslations.description ?? '',
          price: String(editingProduct.price ?? ''),
          currency: editingProduct.currency ?? 'TRY',
          tags: (editingProduct.tags ?? []).join(', '),
          images: (editingProduct.images ?? []).join('\n'),
          previewVideoUrl: editingProduct.previewVideoUrl ?? '',
          categoryId: editingProduct.categoryId ?? '',
          isPreOrder: (editingProduct as any).isPreOrder ?? false,
          preOrderShipDate: (editingProduct as any).preOrderShipDate
            ? new Date((editingProduct as any).preOrderShipDate).toISOString().slice(0, 10)
            : '',
          preOrderEndsAt: (editingProduct as any).preOrderEndsAt
            ? new Date((editingProduct as any).preOrderEndsAt).toISOString().slice(0, 10)
            : '',
          preOrderLimit: (editingProduct as any).preOrderLimit
            ? String((editingProduct as any).preOrderLimit)
            : '',
        }
      : EMPTY_FORM,
  );

  function set(field: keyof ProductFormState, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function buildTranslations() {
    const en: Record<string, string> = {};
    if (form.titleEn.trim()) en.title = form.titleEn.trim();
    if (form.descriptionEn.trim()) en.description = form.descriptionEn.trim();
    return Object.keys(en).length ? { en } : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.tenantId) { setError('Please select a vendor.'); return; }

    const translations = buildTranslations();
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const images = form.images.split('\n').map((u) => u.trim()).filter(Boolean);

    try {
      const previewVideoUrl = form.previewVideoUrl.trim() || undefined;
      const categoryId = form.categoryId || undefined;
      // Pre-order payload (omit fields if pre-order is off so backend doesn't store stale dates)
      const preOrderFields: any = { isPreOrder: form.isPreOrder };
      if (form.isPreOrder) {
        if (form.preOrderShipDate) preOrderFields.preOrderShipDate = new Date(form.preOrderShipDate).toISOString();
        if (form.preOrderEndsAt)   preOrderFields.preOrderEndsAt   = new Date(form.preOrderEndsAt).toISOString();
        if (form.preOrderLimit)    preOrderFields.preOrderLimit    = Number(form.preOrderLimit);
      } else {
        preOrderFields.preOrderShipDate = null;
        preOrderFields.preOrderEndsAt = null;
        preOrderFields.preOrderLimit = null;
      }
      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          title: form.titleTr,
          description: form.descriptionTr,
          price: parseFloat(form.price),
          currency: form.currency,
          tags,
          images,
          translations,
          previewVideoUrl,
          categoryId,
          ...preOrderFields,
        });
      } else {
        await createProduct.mutateAsync({
          tenantId: form.tenantId,
          title: form.titleTr,
          description: form.descriptionTr,
          price: parseFloat(form.price),
          currency: form.currency,
          tags,
          images,
          translations,
          previewVideoUrl,
          categoryId,
          ...preOrderFields,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Something went wrong');
    }
  }

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto card p-6">
        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
          {editingProduct ? 'Edit Product' : 'Create Product'}
        </h2>

        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Vendor selector */}
          <div>
            <label className="label">Vendor</label>
            <select
              required
              value={form.tenantId}
              onChange={(e) => set('tenantId', e.target.value)}
              disabled={!!editingProduct || vendorsLoading}
              className="input"
            >
              <option value="">{vendorsLoading ? 'Loading vendors…' : 'Select a vendor…'}</option>
              {vendors.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Category selector */}
          <div>
            <label className="label">Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              className="input"
            >
              <option value="">No category</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ''}{(cat as any).nameEn ? `${(cat as any).nameEn} / ${cat.name}` : cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bilingual title */}
          <BilingualFields
            langTab={langTabTitle}
            setLangTab={setLangTabTitle}
            label="Title"
            fieldTr={form.titleTr}
            fieldEn={form.titleEn}
            onChangeTr={(v) => set('titleTr', v)}
            onChangeEn={(v) => set('titleEn', v)}
            required
          />

          {/* Bilingual description */}
          <BilingualFields
            langTab={langTabDesc}
            setLangTab={setLangTabDesc}
            label="Description"
            fieldTr={form.descriptionTr}
            fieldEn={form.descriptionEn}
            onChangeTr={(v) => set('descriptionTr', v)}
            onChangeEn={(v) => set('descriptionEn', v)}
            multiline
            required
          />

          {/* Price + currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Currency</label>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className="input">
                <option>TRY</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="music, apparel, limited"
              className="input"
            />
          </div>

          {/* Images */}
          <div>
            <label className="label">Image URLs (one per line)</label>
            <textarea
              rows={3}
              value={form.images}
              onChange={(e) => set('images', e.target.value)}
              placeholder="https://…"
              className="input resize-none font-mono text-xs"
            />
          </div>

          {/* Preview GIF/Video */}
          <div>
            <label className="label">Preview Animation URL <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              value={form.previewVideoUrl}
              onChange={(e) => set('previewVideoUrl', e.target.value)}
              placeholder="https://… (.mp4, .webm or .gif)"
              className="input font-mono text-xs"
            />
            <p className="text-xs text-gray-400 mt-1">
              Use an MP4/WebM for best results — it plays once then stops, and replays on hover.
              GIF files play on hover and loop while the mouse is over the card.
            </p>
          </div>

          {/* ── Pre-order ────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/40 dark:bg-gray-900/30">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPreOrder}
                onChange={(e) => set('isPreOrder', e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-2">
                  <span>🕐</span> Sell as pre-order
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Customers can order before production. Stock isn't deducted. Each line waits for admin approval; on approval, the buyer is emailed.
                </p>
              </div>
            </label>

            {form.isPreOrder && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Estimated ship date</span>
                  <input
                    type="date"
                    value={form.preOrderShipDate}
                    onChange={(e) => set('preOrderShipDate', e.target.value)}
                    className="input w-full mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Pre-order ends</span>
                  <input
                    type="date"
                    value={form.preOrderEndsAt}
                    onChange={(e) => set('preOrderEndsAt', e.target.value)}
                    className="input w-full mt-1"
                  />
                  <span className="text-[10px] text-gray-400">Leave blank for open window</span>
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Max units (limit)</span>
                  <input
                    type="number"
                    min={1}
                    value={form.preOrderLimit}
                    onChange={(e) => set('preOrderLimit', e.target.value)}
                    placeholder="Unlimited"
                    className="input w-full mt-1"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Saving…' : editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Image Focal-Point Settings Modal ─────────────────────────────────────────

function ImageSettingsModal({ product, onClose }: { product: any; onClose: () => void }) {
  const updateProduct = useAdminUpdateProduct();
  const images: string[] = product.images ?? [];
  // imageSettings stored as { [index: string]: { x: number, y: number } }
  const [settings, setSettings] = useState<Record<string, { x: number; y: number }>>(() => {
    const raw = (product.imageSettings as any) ?? {};
    return raw;
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>, idx: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setSettings((prev) => ({ ...prev, [String(idx)]: { x, y } }));
    setSaved(false);
  }

  function resetImage(idx: number) {
    setSettings((prev) => {
      const next = { ...prev };
      delete next[String(idx)];
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setError('');
    setSaved(false);
    try {
      await updateProduct.mutateAsync({ id: product.id, imageSettings: settings });
      setSaved(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Save failed');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Fotoğraf Konumu — {product.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Her fotoğrafa tıklayarak odak noktasını ayarlayın. Bu, thumbnail görünümünde hangi kısmın gösterileceğini belirler.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl leading-none">×</button>
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

        {images.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm italic">Bu ürüne henüz fotoğraf eklenmemiş.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((url, idx) => {
              const fp = settings[String(idx)];
              const objPos = fp ? `${fp.x}% ${fp.y}%` : '50% 50%';
              return (
                <div key={idx} className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Görsel {idx + 1}
                    {fp && <span className="ml-2 text-purple-500">● {fp.x}% {fp.y}%</span>}
                    {!fp && <span className="ml-2 text-gray-400">(merkez)</span>}
                  </p>
                  {/* Click-to-set focal point */}
                  <div
                    className="relative w-full h-48 rounded-xl overflow-hidden cursor-crosshair border-2 border-transparent hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
                    style={{ background: '#111' }}
                    onClick={(e) => handleImageClick(e, idx)}
                    title="Tıklayarak odak noktası ayarlayın"
                  >
                    <img
                      src={url}
                      alt={`Product image ${idx + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                      style={{ objectPosition: objPos }}
                    />
                    {/* Focal point dot */}
                    {fp && (
                      <div
                        className="absolute w-4 h-4 rounded-full bg-purple-500 border-2 border-white shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${fp.x}%`, top: `${fp.y}%` }}
                      />
                    )}
                    {/* Crosshair guide */}
                    {!fp && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-4 h-4 rounded-full border-2 border-white/60 bg-white/20" />
                      </div>
                    )}
                  </div>
                  {/* Thumbnail preview */}
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Thumbnail önizleme</p>
                    <div className="w-full h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img
                        src={url}
                        alt="thumbnail preview"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: objPos }}
                      />
                    </div>
                  </div>
                  {fp && (
                    <button
                      type="button"
                      onClick={() => resetImage(idx)}
                      className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    >
                      Sıfırla (merkez)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleSave}
            disabled={updateProduct.isPending}
            className="btn-primary px-6"
          >
            {updateProduct.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400">✓ Kaydedildi</span>}
          <button onClick={onClose} className="btn-ghost ml-auto">Kapat</button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('admin-products', 20);
  const [showForm, setShowForm] = useState(false);
  const [variantsFor, setVariantsFor] = useState<any | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [photoSettingsFor, setPhotoSettingsFor] = useState<any | null>(null);

  const { data: allData, isLoading: allLoading } = useAdminAllProducts({ page, limit: pageSize });
  const { data: pendingData, isLoading: pendingLoading } = useAdminPendingProducts({ page, limit: pageSize });

  const publishProduct = useAdminPublishProduct();
  const unpublishProduct = useAdminUnpublishProduct();
  const deleteProduct = useAdminDeleteProduct();
  const review = useReviewProduct();

  function openCreate() {
    setEditingProduct(null);
    setShowForm(true);
  }

  function openEdit(product: any) {
    setEditingProduct(product);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingProduct(null);
  }

  async function handleDelete(id: string) {
    await deleteProduct.mutateAsync(id);
    setDeleteConfirm(null);
  }

  async function handleApprove(id: string) {
    try { await review.mutateAsync({ id, decision: 'APPROVE' }); } catch {}
  }

  async function handleReject() {
    if (!rejectModal) return;
    try {
      await review.mutateAsync({ id: rejectModal.id, decision: 'REJECT', reason: rejectReason });
      setRejectModal(null);
      setRejectReason('');
    } catch {}
  }

  const items = activeTab === 'all' ? (allData?.items ?? []) : (pendingData?.items ?? []);
  const total = activeTab === 'all' ? (allData?.total ?? 0) : (pendingData?.total ?? 0);
  const isLoading = activeTab === 'all' ? allLoading : pendingLoading;

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{total} total</p>
        </div>
        <div className="flex items-center gap-3">
          <PageSizeSelector value={pageSize} onChange={(n) => { setPageSize(n); setPage(1); }} />
          <button onClick={openCreate} className="btn-primary">
            New Product
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
        {([['all', 'All Products'], ['pending', 'Pending Review']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {label}
            {key === 'pending' && (pendingData?.total ?? 0) > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 rounded-full">
                {pendingData?.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-center py-16 text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
          No products found
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Vendor</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">EN?</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((product: any) => {
                const hasEn = !!(product.translations as any)?.en;
                return (
                  <tr key={product.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{product.title}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{product.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {product.tenant?.displayName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{formatPrice(product.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${STATUS_BADGE[product.status] ?? 'badge-gray'}`}>
                        {product.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${hasEn ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-600'}`}>
                        {hasEn ? '✓' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(product)}
                          className="text-xs border border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Edit
                        </button>

                        {/* Variants */}
                        <button
                          onClick={() => setVariantsFor(product)}
                          className="text-xs border border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Variants ({product.variants?.length ?? 0})
                        </button>

                        {/* Photo focal-point settings */}
                        {(product.images?.length ?? 0) > 0 && (
                          <button
                            onClick={() => setPhotoSettingsFor(product)}
                            className="text-xs border border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            📸 Photos
                          </button>
                        )}

                        {/* Publish / Unpublish */}
                        {product.status !== 'LIVE' ? (
                          <button
                            onClick={() => publishProduct.mutate(product.id)}
                            disabled={publishProduct.isPending}
                            className="text-xs bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800/60 text-green-700 dark:text-green-300 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Publish
                          </button>
                        ) : (
                          <button
                            onClick={() => unpublishProduct.mutate(product.id)}
                            disabled={unpublishProduct.isPending}
                            className="text-xs bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-800/60 text-yellow-700 dark:text-yellow-300 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Unpublish
                          </button>
                        )}

                        {/* Approve/Reject for pending */}
                        {activeTab === 'pending' && product.status === 'PENDING_REVIEW' && (
                          <>
                            <button
                              onClick={() => handleApprove(product.id)}
                              disabled={review.isPending}
                              className="text-xs bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectModal({ id: product.id, title: product.title })}
                              className="text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800/60 text-red-700 dark:text-red-300 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Delete */}
                        {deleteConfirm === product.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-xs text-red-600 border border-red-300 dark:border-red-800 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              Confirm
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
                            onClick={() => setDeleteConfirm(product.id)}
                            className="text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
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

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-end gap-3 mt-4 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">Prev</button>
          <span className="text-gray-500 dark:text-gray-400">Page {page}</span>
          <button disabled={items.length < pageSize} onClick={() => setPage((p) => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <ProductFormModal
          editingProduct={editingProduct}
          onClose={closeForm}
        />
      )}

      {/* Variants modal */}
      {variantsFor && (
        <VariantsModal
          product={items.find((p: any) => p.id === variantsFor.id) ?? variantsFor}
          onClose={() => setVariantsFor(null)}
        />
      )}

      {/* Photo settings modal */}
      {photoSettingsFor && (
        <ImageSettingsModal
          product={items.find((p: any) => p.id === photoSettingsFor.id) ?? photoSettingsFor}
          onClose={() => setPhotoSettingsFor(null)}
        />
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card p-6 w-96 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Reject — {rejectModal.title}</h3>
            <div>
              <label className="label">Reason</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this product is being rejected…"
                className="input resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={review.isPending} className="flex-1 btn-primary">
                Confirm Reject
              </button>
              <button onClick={() => setRejectModal(null)} className="flex-1 btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
