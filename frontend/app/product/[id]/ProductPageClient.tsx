'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../../components/layout/Navbar';
import { useProduct, useProducts } from '../../../hooks/useProducts';
import { useAddToCart } from '../../../hooks/useCart';
import { useReviews, useReviewStats, useCreateReview, useDeleteReview } from '../../../hooks/useReviews';
import { useWishlistCheck, useToggleWishlist } from '../../../hooks/useWishlist';
import { useTrackView } from '../../../hooks/useRecentlyViewed';
import { useAuthStore } from '../../../store/auth.store';
import { Spinner } from '../../../components/ui/Spinner';
import { toast } from '../../../store/toast.store';
import { formatPrice, brandGradient } from '../../../lib/format';
import { useI18n } from '../../../lib/i18n';
import { Footer } from '../../../components/layout/Footer';
import type { ProductVariant } from '../../../types';
import { ProductImage } from '../../../components/ui/ProductImage';

export function ProductPageClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: product, isLoading } = useProduct(id);
  const addToCart = useAddToCart();
  const { data: wishlistStatus } = useWishlistCheck(id, !!user);
  const toggleWishlist = useToggleWishlist();
  const isWishlisted = wishlistStatus?.wishlisted ?? false;

  useTrackView(product);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const t = useI18n((s) => s.t);

  const [heartPop, setHeartPop] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);

  function handleToggleWishlist() {
    if (!user) { toast('info', t('wishlist.loginRequired')); return; }
    setHeartPop(true);
    setTimeout(() => setHeartPop(false), 600);
    toggleWishlist.mutate(id, {
      onSuccess: (data) => {
        if (data.added) {
          setHeartBurst(true);
          setTimeout(() => setHeartBurst(false), 800);
        }
        toast('success', data.added ? t('wishlist.added') : t('wishlist.removed'));
      },
    });
  }

  if (isLoading) return (
    <>
      <Navbar />
      <div className="flex justify-center py-32"><Spinner size="lg" /></div>
    </>
  );

  if (!product) return (
    <>
      <Navbar />
      <div className="text-center py-32 text-gray-500">Product not found.</div>
    </>
  );

  const variant = selectedVariant ?? product.variants?.[0] ?? null;
  const price = variant?.priceOverride ?? product.price;
  const isPreOrder = !!(product as any).isPreOrder;
  const preOrderEndsAt = (product as any).preOrderEndsAt ? new Date((product as any).preOrderEndsAt) : null;
  const preOrderClosed = !!(preOrderEndsAt && preOrderEndsAt < new Date());
  // Stock is irrelevant for pre-orders — sales are based on the pre-order
  // window, not on inventory.
  const inStock = isPreOrder ? !preOrderClosed : (variant?.stockQty ?? 0) > 0;
  const canPurchase = isPreOrder ? !preOrderClosed : inStock;

  async function handleAddToCart() {
    if (!variant) return;
    try {
      await addToCart.mutateAsync({ variantId: variant.id, qty });
      setAdded(true);
      toast('success', `${product!.title} ${t('shop.addedToCart')}`);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      toast('error', t('shop.failedToAdd'));
    }
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/" className="hover:text-gray-900 dark:hover:text-white">{t('pdp.home')}</Link>
          <span>/</span>
          {product.tenant && (
            <>
              <Link href={`/store/${product.tenant.slug}`} className="hover:text-gray-900 dark:hover:text-white">
                {product.tenant.displayName}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-800 dark:text-gray-300">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Images */}
          <div className="space-y-3">
            <div className="aspect-square rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden flex items-center justify-center">
              <ProductImage
                src={product.images?.[0]}
                alt={product.title}
                tenantSlug={product.tenant?.slug}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2">
                {product.images.slice(1).map((img, i) => {
                  const fpi = (product.imageSettings as any)?.[String(i + 1)];
                  return (
                    <div key={i} className="h-20 w-20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ objectPosition: fpi ? `${fpi.x}% ${fpi.y}%` : '50% 50%' }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-6">
            {product.tenant && (
              <Link href={`/store/${product.tenant.slug}`} className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium">
                {product.tenant.displayName}
              </Link>
            )}

            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{product.title}</h1>
                <button
                  onClick={handleToggleWishlist}
                  className="relative shrink-0 mt-1 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-all"
                  aria-label="Toggle wishlist"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill={isWishlisted ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`transition-colors duration-200 ${isWishlisted ? 'text-red-500' : 'text-gray-400 dark:text-gray-500 hover:text-red-400'} ${heartPop ? 'animate-heart-pop' : ''}`}
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {/* Burst particles when newly favorited */}
                  {heartBurst && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span
                          key={i}
                          className="absolute h-1.5 w-1.5 rounded-full bg-red-500"
                          style={{
                            animation: 'heartBurst 0.7s cubic-bezier(.34,1.56,.64,1) both',
                            animationDelay: `${i * 30}ms`,
                            transform: `rotate(${i * 60}deg) translateY(-18px)`,
                          }}
                        />
                      ))}
                    </span>
                  )}
                </button>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(price)}
                </span>
              </div>
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="badge-gray text-xs">{tag}</span>
                ))}
              </div>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <p className="label">{t('pdp.selectOption')}</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      disabled={v.stockQty === 0}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors
                        ${variant?.id === v.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'}
                        ${v.stockQty === 0 ? 'opacity-40 cursor-not-allowed line-through' : ''}
                      `}
                    >
                      {Object.values(v.attributes as Record<string, string>).join(' / ')}
                      {v.stockQty > 0 && v.stockQty <= (v.lowStockThreshold ?? 5) && (
                        <span className="ml-1.5 text-yellow-400 text-xs">Low</span>
                      )}
                    </button>
                  ))}
                </div>
                {variant && (
                  <p className="mt-2 text-xs text-gray-500">
                    SKU: {variant.sku} · {variant.stockQty} {t('pdp.inStock')}
                  </p>
                )}
              </div>
            )}

            {/* Qty + Add to cart */}
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3 py-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >−</button>
                <span className="px-4 py-2.5 text-gray-900 dark:text-white font-medium min-w-[2.5rem] text-center">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(variant?.stockQty ?? 99, qty + 1))}
                  className="px-3 py-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >+</button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={!canPurchase || !variant || addToCart.isPending}
                className={`flex-1 btn-primary py-2.5 ${!canPurchase ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {addToCart.isPending
                  ? t('pdp.adding')
                  : added
                    ? '✓'
                    : isPreOrder
                      ? preOrderClosed ? 'Pre-order closed' : '🕐 Pre-order now'
                      : inStock ? t('pdp.addToCart') : t('pdp.outOfStock')}
              </button>
            </div>

            {/* Pre-order info card */}
            {isPreOrder && (
              <div className="mt-3 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50 dark:bg-purple-900/20 p-4 text-sm">
                <p className="font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                  <span>🕐</span> This is a pre-order
                </p>
                <ul className="mt-2 space-y-1 text-purple-800 dark:text-purple-200 text-xs">
                  {(product as any).preOrderShipDate && (
                    <li>📦 Estimated ship date: <b>{new Date((product as any).preOrderShipDate).toLocaleDateString()}</b></li>
                  )}
                  {preOrderEndsAt && (
                    <li>⏳ {preOrderClosed ? 'Closed' : 'Open until'}: <b>{preOrderEndsAt.toLocaleDateString()}</b></li>
                  )}
                  {(product as any).preOrderLimit && (
                    <li>📊 Limited to <b>{(product as any).preOrderLimit}</b> units total</li>
                  )}
                  <li className="text-purple-700/80 dark:text-purple-300/80 mt-1">
                    You'll receive a confirmation email once your pre-order is approved by the seller.
                  </li>
                </ul>
              </div>
            )}

            {/* Description */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('pdp.aboutProduct')}</h3>
              {product.description ? (
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{product.description}</p>
              ) : (
                <p className="text-gray-400 dark:text-gray-600 italic text-sm">{t('pdp.noDescription')}</p>
              )}
            </div>

            {/* Shipping note */}
            {product.shippingNote && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 px-4 py-3">
                  <span className="text-xl mt-0.5">🚚</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-0.5">Kargo Bilgisi</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">{product.shippingNote}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <ReviewSection productId={product.id} />

        {/* Related products */}
        {product.tenant && (
          <RelatedProducts tenantId={product.tenant.id} currentProductId={product.id} tenantSlug={product.tenant.slug} />
        )}
      </div>

      {/* Sticky mobile add-to-cart bar — only visible on small screens.
          Adds a safe bottom inset so the page content can scroll past it. */}
      <div
        className="fixed bottom-0 inset-x-0 z-30 lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur px-3 py-3 flex items-center gap-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{product.title}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatPrice((variant?.priceOverride ?? product.price) * qty)}
          </p>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={!canPurchase || !variant || addToCart.isPending}
          className={`flex-shrink-0 btn-primary px-5 py-3 ${!canPurchase ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {addToCart.isPending
            ? t('pdp.adding')
            : added
              ? '✓'
              : isPreOrder
                ? preOrderClosed ? 'Closed' : '🕐 Pre-order'
                : inStock ? t('pdp.addToCart') : t('pdp.outOfStock')}
        </button>
      </div>
      {/* Spacer so content isn't hidden behind the sticky bar on mobile */}
      <div className="h-20 lg:hidden" aria-hidden="true" />

      <Footer />
    </>
  );
}

function StarDisplay({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={star <= rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          className={star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="p-0.5"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={star <= (hover || value) ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            className={star <= (hover || value) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function ReviewSection({ productId }: { productId: string }) {
  const t = useI18n((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const { data: stats } = useReviewStats(productId);
  const { data: reviews, isLoading } = useReviews(productId, page);
  const createReview = useCreateReview();
  const deleteReview = useDeleteReview();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    try {
      await createReview.mutateAsync({ productId, rating, comment: comment || undefined });
      toast('success', t('review.success'));
      setShowForm(false);
      setRating(0);
      setComment('');
    } catch (err: any) {
      toast('error', err?.response?.data?.message ?? t('review.error'));
    }
  }

  return (
    <section className="mt-16 pt-10 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('review.title')}</h2>
          {stats && stats.count > 0 && (
            <div className="flex items-center gap-2">
              <StarDisplay rating={Math.round(stats.average)} />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {stats.average.toFixed(1)} {t('review.of5')} ({stats.count} {t('review.reviews')})
              </span>
            </div>
          )}
        </div>
        {user && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary text-sm px-4 py-2"
          >
            {showForm ? t('admin.cancel') : t('review.writeReview')}
          </button>
        )}
        {!user && (
          <Link href="/auth/login" className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium">
            {t('review.loginRequired')}
          </Link>
        )}
      </div>

      {/* Rating distribution */}
      {stats && stats.count > 0 && (
        <div className="mb-8 flex flex-col gap-1.5 max-w-sm">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star] ?? 0;
            const pct = stats.count > 0 ? (count / stats.count) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-gray-500 dark:text-gray-400">{star}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400 shrink-0">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right text-gray-400">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-6 space-y-4">
          <div>
            <p className="label mb-1">{t('review.rating')}</p>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <div>
            <p className="label mb-1">{t('review.comment')}</p>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="input resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={rating === 0 || createReview.isPending}
            className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
          >
            {createReview.isPending ? t('review.submitting') : t('review.submit')}
          </button>
        </form>
      )}

      {/* Review list */}
      {isLoading && <p className="text-gray-400 text-center py-8">{t('admin.loading')}</p>}

      {reviews && reviews.items.length === 0 && !showForm && (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('review.noReviews')}</p>
      )}

      {reviews && reviews.items.length > 0 && (
        <div className="space-y-4">
          {reviews.items.map((review) => (
            <div key={review.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold">
                    {(review.customer.name ?? review.customer.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {review.customer.name ?? review.customer.email.split('@')[0]}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarDisplay rating={review.rating} size={12} />
                      <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {user && (user.id === review.customerId || user.role === 'PLATFORM_ADMIN' || user.role === 'GOD_USER') && (
                  <button
                    onClick={() => deleteReview.mutate(review.id)}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700"
                  >
                    {t('review.delete')}
                  </button>
                )}
              </div>
              {review.comment && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{review.comment}</p>
              )}
            </div>
          ))}

          {/* Pagination */}
          {reviews.total > reviews.limit && (
            <div className="flex items-center gap-3 justify-center text-sm pt-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.prev')}</button>
              <span className="text-gray-500 dark:text-gray-400">{t('admin.page')} {page}</span>
              <button disabled={reviews.items.length < reviews.limit} onClick={() => setPage((p) => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.next')}</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function RelatedProducts({ tenantId, currentProductId, tenantSlug }: { tenantId: string; currentProductId: string; tenantSlug: string }) {
  const { data } = useProducts({ tenantId, limit: 5 });
  const related = (data?.items ?? []).filter((p) => p.id !== currentProductId).slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t border-gray-200 dark:border-gray-800">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{useI18n.getState().t('pdp.relatedProducts')}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {related.map((p) => {
          const price = p.variants?.[0]?.priceOverride ?? p.price;
          return (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              className="group card overflow-hidden hover:border-purple-500 dark:hover:border-purple-700 hover:shadow-lg hover:shadow-purple-500/10 transition-all"
            >
              <div className="aspect-square overflow-hidden">
                <ProductImage
                  src={p.images?.[0]}
                  alt={p.title}
                  tenantSlug={tenantSlug}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">{p.title}</h3>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1">{formatPrice(price)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
