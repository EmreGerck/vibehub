'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';
import { StoreTabBar } from '../../../components/store/StoreTabBar';
import { useVendorBySlug, useFollowVendor, useUnfollowVendor, useFollowStatus } from '../../../hooks/useVendors';
import { useProducts } from '../../../hooks/useProducts';
import { useAddToCart } from '../../../hooks/useCart';
import { useAuthStore } from '../../../store/auth.store';
import { toast } from '../../../store/toast.store';
import { Spinner } from '../../../components/ui/Spinner';
import { formatPrice, brandGradient } from '../../../lib/format';
import { useI18n } from '../../../lib/i18n';
import { useVendorEvents } from '../../../hooks/useEvents';
import { useVendorMedia } from '../../../hooks/useMedia';
import type { Product, VendorEvent, VendorMedia } from '../../../types';
import { StoreForum } from '../../../components/store/StoreForum';
import { ProductImage } from '../../../components/ui/ProductImage';

const ARTIST_TYPE_KEYS: Record<string, string> = {
  BAND: 'store.band',
  COMEDIAN: 'store.comedian',
  INFLUENCER: 'store.influencer',
  ARTIST: 'store.artist',
  OTHER: 'store.other',
};

export function StorePageClient() {
  const { slug } = useParams<{ slug: string }>();
  const t = useI18n((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('products');

  const { data: vendor, isLoading: vendorLoading } = useVendorBySlug(slug);
  const { data: products, isLoading: productsLoading } = useProducts(
    vendor ? { tenantId: vendor.id, limit: 24 } : undefined,
  );
  const { data: followData } = useFollowStatus(vendor?.id, !!user && !!vendor);
  const follow = useFollowVendor();
  const unfollow = useUnfollowVendor();
  const isFollowing = followData?.following ?? false;

  function handleFollow() {
    if (!user) { toast('info', t('store.loginToFollow')); return; }
    if (!vendor) return;
    if (isFollowing) {
      unfollow.mutate(vendor.id);
    } else {
      follow.mutate(vendor.id);
    }
  }

  // Filter ribbon by per-vendor feature toggles. Defaults to enabled so that
  // older API responses (without the flags) still show all tabs.
  const allTabs = [
    { key: 'products', label: t('store.tabProducts'), icon: '🛍', enabled: true },
    { key: 'events',   label: t('store.tabEvents'),   icon: '🎫', enabled: vendor?.eventsEnabled ?? true },
    { key: 'media',    label: t('store.tabMedia'),    icon: '🎵', enabled: vendor?.mediaEnabled  ?? true },
    { key: 'forum',    label: t('store.tabForum'),    icon: '💬', enabled: vendor?.forumEnabled  ?? true },
  ];
  const tabs = allTabs.filter((t) => t.enabled);

  // If the user lands on a disabled tab (via URL/state), bounce them back to products.
  useEffect(() => {
    if (!vendor) return;
    if (!tabs.find((tt) => tt.key === activeTab)) {
      setActiveTab('products');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor?.eventsEnabled, vendor?.mediaEnabled, vendor?.forumEnabled, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <Navbar />

      {vendorLoading && (
        <div className="flex-1 flex justify-center py-32"><Spinner size="lg" /></div>
      )}

      {vendor && (
        <>
          {/* ── Hero Banner — full-bleed, supports real image ── */}
          <div className="relative overflow-hidden min-h-[260px] sm:min-h-[340px]">
            {(vendor as any).bannerUrl ? (
              <img
                src={(vendor as any).bannerUrl}
                alt={`${vendor.displayName} banner`}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: vendor.brandColor
                    ? `linear-gradient(135deg, ${vendor.brandColor} 0%, ${vendor.brandColor}88 100%)`
                    : brandGradient(vendor.slug),
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

            <div className="relative mx-auto max-w-screen-2xl px-4 sm:px-10 pt-16 sm:pt-20 pb-6 sm:pb-10 flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
              {/* Avatar / Logo */}
              <div className="shrink-0">
                {(vendor as any).logoUrl ? (
                  <img
                    src={(vendor as any).logoUrl}
                    alt={vendor.displayName}
                    className="h-28 w-28 sm:h-36 sm:w-36 rounded-2xl border-4 border-white/90 shadow-2xl object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div
                    className="h-28 w-28 sm:h-36 sm:w-36 rounded-2xl border-4 border-white/90 shadow-2xl flex items-center justify-center text-5xl font-black text-white"
                    style={{ background: vendor.brandColor ?? brandGradient(vendor.slug) }}
                  >
                    {vendor.displayName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
              </div>

              {/* Name + badge + bio snippet */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-xl">
                    {vendor.displayName}
                  </h1>
                  {vendor.artistType && (
                    <span className="px-3 py-0.5 rounded-full bg-white/20 backdrop-blur text-white text-xs font-semibold border border-white/20">
                      {t(ARTIST_TYPE_KEYS[vendor.artistType] ?? 'store.other')}
                    </span>
                  )}
                </div>
                <p className="text-white/60 text-sm mb-2">@{vendor.slug}</p>
                {(vendor as any).bio && (
                  <p className="text-white/80 text-sm leading-relaxed line-clamp-2 max-w-xl hidden sm:block">
                    {(vendor as any).bio}
                  </p>
                )}
              </div>

              {/* Stats + follow button — full width on mobile, right-aligned on desktop */}
              <div className="w-full sm:w-auto sm:shrink-0 flex items-center sm:items-end gap-4 sm:gap-8">
                <div className="hidden sm:flex gap-8 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{products?.total ?? 0}</p>
                    <p className="text-xs text-white/60 uppercase tracking-wider">{t('store.products')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{(vendor as any)._count?.followers ?? 0}</p>
                    <p className="text-xs text-white/60 uppercase tracking-wider">{t('store.followers')}</p>
                  </div>
                </div>
                {/* Mobile-only compact stats */}
                <div className="flex sm:hidden gap-4 text-white/80 text-xs">
                  <span><b className="text-white">{products?.total ?? 0}</b> {t('store.products')}</span>
                  <span><b className="text-white">{(vendor as any)._count?.followers ?? 0}</b> {t('store.followers')}</span>
                </div>
                <button
                  onClick={handleFollow}
                  className={`ml-auto sm:ml-0 px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all shadow-xl ${
                    isFollowing
                      ? 'bg-white/20 backdrop-blur text-white border border-white/30 hover:bg-white/30'
                      : 'bg-white text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {isFollowing ? `✓ ${t('store.following')}` : t('store.follow')}
                </button>
              </div>
            </div>

            <StoreMediaStrip tenantId={vendor.id} />
          </div>

          {/* ── Tab navigation + content — wider layout ── */}
          <div className="mx-auto max-w-screen-2xl px-3 sm:px-10 py-6 sm:py-8 flex-1">
            <StoreTabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

            {activeTab === 'products' && (
              <>
                {productsLoading && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse aspect-[3/4]" />
                    ))}
                  </div>
                )}
                {products && products.items.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-20 text-center">
                    <p className="text-gray-500 text-lg">{t('store.noProducts')}</p>
                  </div>
                )}
                {products && products.items.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
                    {products.items.map((p) => (
                      <StoreProductCard key={p.id} product={p} vendorSlug={vendor.slug} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'events' && vendor && (
              <StoreEventsTab tenantId={vendor.id} />
            )}

            {activeTab === 'media' && vendor && (
              <StoreMediaTab tenantId={vendor.id} />
            )}

            {activeTab === 'forum' && vendor && (
              <StoreForum tenantId={vendor.id} vendorName={vendor.displayName} vendorSlug={slug} />
            )}
          </div>
        </>
      )}

      {!vendorLoading && !vendor && (
        <div className="flex-1 flex items-center justify-center px-4 py-32">
          <div className="text-center space-y-4">
            <p className="text-8xl font-extrabold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">?</p>
            <p className="text-gray-500 dark:text-gray-400 text-xl">{t('store.notFound')}</p>
            <Link href="/shop" className="btn-primary mt-2 inline-flex px-6 py-2.5">{t('store.browseAll')}</Link>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

function StoreProductCard({ product, vendorSlug }: { product: Product; vendorSlug: string }) {
  const t = useI18n((s) => s.t);
  const price = product.variants?.[0]?.priceOverride ?? product.price;
  const defaultVariant = product.variants?.[0];
  const addToCart = useAddToCart();
  const user = useAuthStore((s) => s.user);

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast('info', t('store.loginToCart')); return; }
    if (!defaultVariant) return;
    addToCart.mutate(
      { variantId: defaultVariant.id, qty: 1 },
      {
        onSuccess: () => toast('success', `${product.title} ${t('store.addedToCart')}`),
        onError: () => toast('error', t('store.addToCartFailed')),
      },
    );
  }

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden card hover:border-purple-600 dark:hover:border-purple-700 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200"
    >
      <div className="aspect-square overflow-hidden relative">
        <ProductImage
          src={product.images?.[0]}
          alt={product.title}
          tenantSlug={vendorSlug}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {(product as any).isPreOrder && (
          <span className="absolute top-2 left-2 z-10 text-[10px] font-bold px-2 py-1 rounded-full bg-purple-600 text-white shadow-md">
            {t('preOrder.badge')}
          </span>
        )}
        {defaultVariant && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-lg text-gray-700 dark:text-gray-200 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hover:bg-purple-600 hover:text-white"
            aria-label="Quick add to cart"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>
      <div className="p-2.5 sm:p-4 flex flex-col gap-1">
        <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors line-clamp-1">
          {product.title}
        </h3>
        <p className="text-purple-600 dark:text-purple-400 font-bold text-sm sm:text-base">{formatPrice(price)}</p>
        {product.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {product.tags.slice(0, 3).map((t) => (
              <span key={t} className="badge-gray text-[10px]">{t}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Events Tab ────────────────────────────────────────────────────────────────

function StoreEventsTab({ tenantId }: { tenantId: string }) {
  const t = useI18n((s) => s.t);
  const { data: events, isLoading } = useVendorEvents(tenantId);

  if (isLoading) return <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>;
  if (!events?.length) return (
    <div className="text-center py-20 text-gray-400 dark:text-gray-600">
      <p className="text-5xl mb-4">🎫</p>
      <p className="text-lg">{t('event.noEvents')}</p>
    </div>
  );

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.date) >= now);
  const past = events.filter(e => new Date(e.date) < now);

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">{t('event.upcoming')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {upcoming.map(ev => <EventCard key={ev.id} ev={ev} t={t} />)}
          </div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">{t('event.past')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 opacity-60">
            {past.map(ev => <EventCard key={ev.id} ev={ev} t={t} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ ev, t }: { ev: VendorEvent; t: (k: string) => string }) {
  return (
    <div className="card overflow-hidden flex flex-col">
      {ev.imageUrl ? (
        <img src={ev.imageUrl} alt={ev.title} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
          <span className="text-4xl">🎫</span>
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <p className="font-semibold text-gray-900 dark:text-white line-clamp-1">{ev.title}</p>
        <p className="text-xs text-gray-500">{new Date(ev.date).toLocaleDateString()} {ev.venue ? `· ${ev.venue}` : ''}</p>
        {ev.description && <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{ev.description}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{ev.provider}</span>
          <a href={ev.href} target="_blank" rel="noreferrer" className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
            {t('event.getTickets')} →
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Media Strip — desktop overlay + mobile slide-out edge panel ──────────────
//
// Desktop (md+): same as before — compact floating overlay top-right of hero.
// Mobile (<md): a small "🎵 Medya" pill anchored to the right edge of the
// screen; tapping it slides a full-height panel in from the right with the
// embedded media. Tapping the backdrop or close button slides it back.
//

function StoreMediaStrip({ tenantId }: { tenantId: string }) {
  const { data: media } = useVendorMedia(tenantId);
  const [open, setOpen] = useState(false);
  const t = useI18n((s) => s.t);

  // Lock body scroll while the mobile panel is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!media?.length) return null;

  return (
    <>
      {/* ── Desktop overlay (unchanged behaviour) ──────────────────────────── */}
      <div className="hidden md:block absolute top-4 right-4 z-10 w-64 space-y-2 max-h-48 overflow-y-auto">
        {media.slice(0, 3).map((m: VendorMedia) => (
          <div key={m.id} className="rounded-xl overflow-hidden shadow-xl bg-black/30 backdrop-blur">
            {m.title && (
              <p className="text-xs font-medium text-white/70 px-2 pt-1.5 truncate">{m.title}</p>
            )}
            <iframe
              src={m.url}
              width="100%"
              height={m.type === 'SPOTIFY' ? 80 : 112}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              className="w-full"
            />
          </div>
        ))}
      </div>

      {/* ── Mobile edge-tab trigger ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-1/2 right-0 -translate-y-1/2 z-30 bg-black/70 backdrop-blur text-white pl-3 pr-2 py-2 rounded-l-xl shadow-2xl flex items-center gap-1.5 text-xs font-semibold border-l border-y border-white/10 active:scale-95 transition-transform"
        aria-label="Open media panel"
      >
        <span className="text-base leading-none">🎵</span>
        <span>{t('store.tabMedia')}</span>
      </button>

      {/* ── Mobile slide-out panel + backdrop ──────────────────────────────── */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        {/* Backdrop: tap anywhere outside to close */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />

        {/* Panel: slides in from the right */}
        <div
          className={`absolute top-0 right-0 h-full w-[88vw] max-w-sm bg-gray-950 text-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <span>🎵</span> {t('store.tabMedia')}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white text-2xl leading-none px-2"
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {media.map((m: VendorMedia) => (
              <div key={m.id} className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
                {m.title && (
                  <p className="text-xs font-medium text-white/80 px-3 pt-2 truncate">{m.title}</p>
                )}
                {m.type === 'SPOTIFY' ? (
                  <iframe
                    src={m.url}
                    width="100%"
                    height={80}
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="w-full"
                  />
                ) : (
                  /* YouTube: responsive 16:9 wrapper */
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={m.url}
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Media Tab ─────────────────────────────────────────────────────────────────

function StoreMediaTab({ tenantId }: { tenantId: string }) {
  const t = useI18n((s) => s.t);
  const { data: media, isLoading } = useVendorMedia(tenantId);

  if (isLoading) return <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>;
  if (!media?.length) return (
    <div className="text-center py-20 text-gray-400 dark:text-gray-600">
      <p className="text-5xl mb-4">🎵</p>
      <p className="text-lg">{t('media.noMedia')}</p>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {media.map((m: VendorMedia) => (
        <div key={m.id} className="card p-3 sm:p-4">
          {m.title && <p className="font-medium text-gray-900 dark:text-white mb-2 sm:mb-3 text-sm sm:text-base">{m.title}</p>}
          {m.type === 'SPOTIFY' ? (
            <iframe
              src={m.url}
              width="100%"
              height={80}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              className="rounded-lg"
            />
          ) : (
            /* YouTube: responsive 16:9 wrapper */
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={m.url}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full rounded-lg"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
