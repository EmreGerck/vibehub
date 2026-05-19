'use client';

import Link from 'next/link';
import { useWishlist, useToggleWishlist } from '../../../hooks/useWishlist';
import { useI18n } from '../../../lib/i18n';
import { formatPrice, brandGradient } from '../../../lib/format';
import { toast } from '../../../store/toast.store';
import { Spinner } from '../../../components/ui/Spinner';
import type { Product } from '../../../types';

export default function WishlistPage() {
  const t = useI18n((s) => s.t);
  const { data, isLoading } = useWishlist();
  const toggleWishlist = useToggleWishlist();

  function handleRemove(product: Product) {
    toggleWishlist.mutate(product.id, {
      onSuccess: () => toast('success', t('wishlist.removed')),
    });
  }

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">{t('wishlist.title')}</h2>

      {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}

      {data && data.items.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 dark:text-gray-600">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">{t('wishlist.empty')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('wishlist.emptyDesc')}</p>
          <Link href="/shop" className="btn-primary inline-flex px-5 py-2">{t('wishlist.browse')}</Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.items.map((product: Product) => {
            const price = product.variants?.[0]?.priceOverride ?? product.price;
            return (
              <div key={product.id} className="flex gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-purple-400 dark:hover:border-purple-700 transition-colors">
                <Link href={`/product/${product.id}`} className="h-20 w-20 shrink-0 rounded-xl overflow-hidden">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: brandGradient(product.tenant?.slug) }}>
                      <span className="text-2xl font-black text-white/20">{product.title[0]}</span>
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${product.id}`}>
                    <p className="font-medium text-gray-900 dark:text-white truncate hover:text-purple-600 dark:hover:text-purple-400 transition-colors">{product.title}</p>
                  </Link>
                  {product.tenant && (
                    <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">{product.tenant.displayName}</p>
                  )}
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{formatPrice(price)}</p>
                </div>
                <button
                  onClick={() => handleRemove(product)}
                  className="shrink-0 self-center p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  aria-label="Remove from wishlist"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" className="text-red-500">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
