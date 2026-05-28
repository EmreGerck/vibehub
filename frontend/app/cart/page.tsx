'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '../../components/layout/Navbar';
import { formatPrice } from '../../lib/format';
import { useCart, useUpdateCartItem, useRemoveCartItem } from '../../hooks/useCart';
import { Spinner } from '../../components/ui/Spinner';
import { useI18n } from '../../lib/i18n';
import type { CartItemData } from '../../hooks/useCart';

export default function CartPage() {
  const { data: cart, isLoading } = useCart();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const t = useI18n((s) => s.t);

  // Group items by vendor
  const byVendor = (cart?.items ?? []).reduce<Record<string, CartItemData[]>>((acc, item) => {
    if (!acc[item.tenantId]) acc[item.tenantId] = [];
    acc[item.tenantId].push(item);
    return acc;
  }, {});

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold mb-8">{t('cart.title')}</h1>

        {isLoading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

        {!isLoading && (!cart || cart.itemCount === 0) && (
          <div className="text-center py-20 space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 dark:text-gray-600">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('cart.empty')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('cart.emptyDesc')}</p>
            <Link href="/shop" className="btn-primary inline-flex px-6 py-2.5">{t('cart.browseMerch')}</Link>
          </div>
        )}

        {cart && cart.itemCount > 0 && (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Items */}
            <div className="flex-1 space-y-6">
              {Object.entries(byVendor).map(([tenantId, items]) => (
                <div key={tenantId} className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{items[0].tenantDisplayName}</p>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {items.map((item) => (
                      <CartRow
                        key={item.variantId}
                        item={item}
                        onUpdate={(qty) => update.mutate({ variantId: item.variantId, qty })}
                        onRemove={() => remove.mutate(item.variantId)}
                        loading={update.isPending || remove.isPending}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:w-72 shrink-0">
              <div className="card p-5 space-y-4 sticky top-20">
                <h2 className="font-semibold text-lg">{t('cart.orderSummary')}</h2>

                {/* Free shipping progress bar — hardcoded threshold ₺250 for now;
                    pulls from PlatformSettings.freeShippingThreshold once wired */}
                <FreeShippingBar total={cart.total} threshold={250} t={t} />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>{t('cart.subtotal')} ({cart.itemCount} {t('cart.items')})</span>
                    <span>{formatPrice(cart.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>{t('cart.shipping')}</span>
                    <span>{t('cart.shippingCalc')}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex justify-between font-bold text-lg text-gray-900 dark:text-white">
                  <span>{t('cart.total')}</span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
                <Link href="/checkout" className="btn-primary w-full py-3 text-center block">
                  {t('cart.checkout')}
                </Link>
                <Link href="/" className="btn-ghost w-full py-2 text-center block text-sm">
                  {t('cart.continueShopping')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function FreeShippingBar({
  total, threshold, t,
}: {
  total: number;
  threshold: number;
  t: (key: string) => string;
}) {
  if (threshold <= 0) return null;
  const remaining = Math.max(0, threshold - total);
  const pct = Math.min(100, (total / threshold) * 100);
  const unlocked = remaining <= 0;

  return (
    <div className="rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 p-3">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
        {unlocked ? (
          <span className="text-green-600 dark:text-green-400 font-semibold">{t('cart.freeShipUnlocked')}</span>
        ) : (
          <>
            🚚 {t('cart.freeShipFrom')} ₺{threshold} —{' '}
            <span className="font-semibold text-purple-700 dark:text-purple-300">
              {t('cart.freeShipMore').replace('{{amount}}', `₺${remaining.toFixed(2)}`)}
            </span>
          </>
        )}
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${unlocked ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CartRow({
  item, onUpdate, onRemove, loading,
}: {
  item: CartItemData;
  onUpdate: (qty: number) => void;
  onRemove: () => void;
  loading: boolean;
}) {
  const price = item.variant.priceOverride ?? item.variant.price;
  const attrs = Object.values(item.variant.attributes).join(' / ');

  return (
    <div className="flex gap-4 p-4">
      <div className="relative h-16 w-16 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 overflow-hidden flex items-center justify-center">
        {item.product.images?.[0]
          ? <Image src={item.product.images[0]} alt="" fill className="object-cover" sizes="64px" />
          : <span className="text-xl font-bold text-gray-400 dark:text-gray-600">{item.product.title?.[0] ?? '?'}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{item.product.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{attrs} · SKU: {item.variant.sku}</p>
        <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">{formatPrice(price)} / {useI18n.getState().t('pdp.each')}</p>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <p className="font-semibold text-gray-900 dark:text-white">{formatPrice(item.lineTotal)}</p>
        <div className="flex items-center border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden text-sm">
          <button
            onClick={() => onUpdate(item.qty - 1)}
            disabled={loading || item.qty <= 1}
            className="px-2.5 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >−</button>
          <span className="px-3 py-1 text-gray-900 dark:text-white">{item.qty}</span>
          <button
            onClick={() => onUpdate(item.qty + 1)}
            disabled={loading || item.qty >= item.variant.stockQty}
            className="px-2.5 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >+</button>
        </div>
        <button onClick={onRemove} disabled={loading} className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
          {useI18n.getState().t('cart.remove')}
        </button>
      </div>
    </div>
  );
}
