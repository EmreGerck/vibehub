'use client';

import { useState } from 'react';
import { useAdminAllProducts, useAdminSetProductDiscount } from '../../../../hooks/useAdmin';
import { formatPrice } from '../../../../lib/format';
import { PriceBadge } from '../../../../components/ui/PriceBadge';
import Image from 'next/image';

// ── Inline edit row ───────────────────────────────────────────────────────────

function DiscountRow({ product }: { product: any }) {
  const updateProduct = useAdminSetProductDiscount();
  const [editing, setEditing] = useState(false);
  const [compareAt, setCompareAt] = useState(
    product.compareAtPrice != null ? String(product.compareAtPrice) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const price = Number(product.price);
  const parsedCompareAt = parseFloat(compareAt);
  const hasDiscount = product.compareAtPrice != null && Number(product.compareAtPrice) > price;
  const pct = hasDiscount ? Math.round((1 - price / Number(product.compareAtPrice)) * 100) : 0;
  const inputInvalid = compareAt !== '' && (isNaN(parsedCompareAt) || parsedCompareAt <= price);

  async function save() {
    setError('');
    setSaving(true);
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        compareAtPrice: compareAt ? parsedCompareAt : null,
      });
      setEditing(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setCompareAt(product.compareAtPrice != null ? String(product.compareAtPrice) : '');
    setEditing(false);
    setError('');
  }

  return (
    <tr className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/40">
      {/* Thumbnail + title */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            {product.images?.[0] ? (
              <Image src={product.images[0]} alt="" fill className="object-cover" sizes="40px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-gray-400 text-xs font-bold">
                {product.title?.[0] ?? '?'}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">{product.title}</p>
            <p className="text-[11px] text-gray-400">{product.tenant?.displayName ?? '—'}</p>
          </div>
        </div>
      </td>

      {/* Current price + sale badge */}
      <td className="px-4 py-3">
        <PriceBadge
          price={price}
          compareAtPrice={product.compareAtPrice != null ? Number(product.compareAtPrice) : undefined}
        />
      </td>

      {/* Discount % */}
      <td className="px-4 py-3">
        {hasDiscount ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            −{pct}%
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      {/* Compare At Price editor */}
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={compareAt}
              onChange={(e) => setCompareAt(e.target.value)}
              placeholder="e.g. 299.00"
              className={`input w-32 px-2 py-1 text-sm ${inputInvalid ? 'border-red-400 dark:border-red-600' : ''}`}
            />
            <button
              onClick={save}
              disabled={saving || (compareAt !== '' && inputInvalid)}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-lg disabled:opacity-50"
            >
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={cancel} className="text-xs text-gray-500 px-1.5 py-1">×</button>
            {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {product.compareAtPrice != null ? formatPrice(Number(product.compareAtPrice)) : '—'}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 underline"
            >
              Edit
            </button>
          </div>
        )}
      </td>

      {/* Remove discount */}
      <td className="px-4 py-3 text-right">
        {hasDiscount && (
          <button
            onClick={async () => {
              await updateProduct.mutateAsync({ id: product.id, compareAtPrice: null });
              setCompareAt('');
            }}
            disabled={updateProduct.isPending}
            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:underline disabled:opacity-50"
          >
            Remove sale
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDiscountsPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'none'>('all');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminAllProducts({ page, limit: 50 });

  const allItems: any[] = data?.items ?? [];

  const items = allItems.filter((p) => {
    if (filter === 'active') return p.compareAtPrice != null && Number(p.compareAtPrice) > Number(p.price);
    if (filter === 'none')   return p.compareAtPrice == null || Number(p.compareAtPrice) <= Number(p.price);
    return true;
  });

  const activeCount = allItems.filter((p) => p.compareAtPrice != null && Number(p.compareAtPrice) > Number(p.price)).length;

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discounts & Sales</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          Set a <strong className="text-gray-700 dark:text-gray-300">Compare At Price</strong> on any product to show a sale badge and crossed-out original price.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Products</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{data?.total ?? '—'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">On Sale</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{activeCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">No Discount</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {(data?.total ?? 0) - activeCount}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-800">
        {([
          ['all', 'All Products'],
          ['active', `On Sale (${activeCount})`],
          ['none', 'No Discount'],
        ] as [typeof filter, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              filter === key
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
          {filter === 'active' ? 'No products on sale yet. Edit a product to add a Compare At Price.' : 'No products found.'}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Sale Price</th>
                <th className="text-left px-4 py-3">Discount</th>
                <th className="text-left px-4 py-3">Compare At (Original)</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((product: any) => (
                <DiscountRow key={product.id} product={product} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {(data?.total ?? 0) > 50 && (
        <div className="flex items-center justify-end gap-3 mt-4 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">Prev</button>
          <span className="text-gray-500 dark:text-gray-400">Page {page}</span>
          <button disabled={items.length < 50} onClick={() => setPage((p) => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
