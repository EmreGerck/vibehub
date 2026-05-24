'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useProducts } from '../hooks/useProducts';
import { useVendors } from '../hooks/useVendors';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { formatPrice, brandGradient } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { ProductGridSkeleton } from '../components/ui/Skeleton';
import { Reveal } from '../components/ui/Reveal';
import { ProductImage } from '../components/ui/ProductImage';
import type { ApiResponse, Product } from '../types';

interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  heading: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string | null;
  gradient: string;
  buttonGradient: string;
  sortOrder: number;
  active: boolean;
}

function useBanners() {
  const locale = useI18n((s) => s.locale);
  return useQuery({
    queryKey: ['banners', locale],
    queryFn: async () => {
      const res = await api.get<ApiResponse<HeroBanner[]>>('/banners', { params: { lang: locale } });
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

// ── Hero Slider ──────────────────────────────────────────────────────────────

function HeroSlider({ banners }: { banners: HeroBanner[] }) {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useI18n((s) => s.t);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % banners.length);
  }, [banners.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const goTo = useCallback((i: number) => setCurrent(i), []);

  useEffect(() => {
    if (banners.length < 2) return;
    intervalRef.current = setInterval(next, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [next, banners.length]);

  if (banners.length === 0) return null;

  const slide = banners[current];

  return (
    <div className="relative overflow-hidden mx-2 sm:mx-6 lg:mx-8 rounded-2xl min-h-[260px] sm:min-h-[380px] md:min-h-[480px]">
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{ background: slide.gradient }}
      />
      {slide.imageUrl && (
        <div
          className="absolute inset-0 opacity-40 transition-opacity duration-700"
          style={{
            backgroundImage: `url(${slide.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 md:py-24 lg:py-28">
        <div className="max-w-3xl">
          <p className="text-white/80 text-xs md:text-sm tracking-[0.14em] uppercase font-semibold mb-3">
            {slide.subtitle}
          </p>
          <h2 className="text-white text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-4 md:mb-6">
            {slide.heading}
          </h2>
          <p className="text-white/80 text-sm md:text-base lg:text-lg leading-relaxed mb-6 md:mb-8 max-w-2xl">
            {slide.description}
          </p>
          <Link
            href={slide.buttonLink}
            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-bold text-sm md:text-base text-white shadow-2xl hover:scale-105 transition-all duration-300"
            style={{
              background: slide.buttonGradient,
              boxShadow: '0 18px 40px rgba(124, 58, 237, 0.25)',
            }}
          >
            {slide.buttonText}
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            aria-label={t('home.prevSlide')}
          >
            <ChevronLeftIcon />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            aria-label={t('home.nextSlide')}
          >
            <ChevronRightIcon />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`${t('home.goToSlide')} ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? 'w-6 bg-white' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Product Card (compact) ───────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const price = product.variants?.[0]?.priceOverride ?? product.price;
  const slug = product.tenant?.slug;
  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden card hover:border-purple-500 dark:hover:border-purple-700 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 shrink-0 w-[220px] sm:w-auto"
    >
      <div className="aspect-square overflow-hidden relative">
        <ProductImage
          src={product.images?.[0]}
          alt={product.title}
          tenantSlug={slug}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-3 flex flex-col gap-1">
        {product.tenant && (
          <p className="text-[10px] text-purple-500 dark:text-purple-400 font-semibold uppercase tracking-wider">
            {product.tenant.displayName}
          </p>
        )}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
          {product.title}
        </h3>
        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(price)}</span>
      </div>
    </Link>
  );
}

// ── Artist Card ──────────────────────────────────────────────────────────────

function ArtistCard({ vendor }: { vendor: any }) {
  return (
    <Link
      href={`/store/${vendor.slug}`}
      className="group block relative rounded-2xl overflow-hidden aspect-[4/3] card hover:border-purple-500 dark:hover:border-purple-700 transition-all"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-800 to-black">
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-[100px] font-extrabold text-white/10 group-hover:text-white/15 transition-colors">
            {vendor.displayName?.[0] ?? '?'}
          </span>
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col justify-end p-5 bg-gradient-to-t from-black/80 via-transparent to-transparent">
        <h3 className="text-white text-xl font-bold">{vendor.displayName}</h3>
        {vendor.artistType && (
          <p className="text-white/60 text-sm mt-1">{vendor.artistType}</p>
        )}
        <span className="text-purple-300 text-sm font-medium mt-2 group-hover:text-purple-200 transition-colors">
          {useI18n.getState().t('home.shopCollection')}
        </span>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { data: banners = [], isLoading: bannersLoading } = useBanners();
  const { data: productsData, isLoading: productsLoading } = useProducts({ limit: 8 });
  const products = productsData?.items ?? [];
  const { data: trendingData, isLoading: trendingLoading } = useProducts({ limit: 8, sortBy: 'price_desc' });
  const trending = trendingData?.items ?? [];
  const { data: vendorsData, isLoading: vendorsLoading } = useVendors({ limit: 10 });
  const activeVendors = (vendorsData?.items ?? []).filter((v: any) => v.status === 'ACTIVE');
  const t = useI18n((s) => s.t);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      {/* Hero slider */}
      <div className="py-6 md:py-8">
        {bannersLoading ? (
          <div className="mx-2 sm:mx-6 lg:mx-8 rounded-2xl bg-gray-200 dark:bg-gray-900 animate-pulse min-h-[260px] sm:min-h-[380px] md:min-h-[480px]" />
        ) : (
          <HeroSlider banners={banners} />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* New arrivals */}
        <Reveal as="up">
          <section className="py-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('home.newArrivals')}</h2>
              <Link href="/shop" className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium underline-grow transition-colors">
                {t('home.viewAll')}
              </Link>
            </div>
            {productsLoading ? (
              <ProductGridSkeleton />
            ) : products.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:overflow-visible">
                {products.slice(0, 8).map((p, i) => (
                  <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </Reveal>

        {/* Trending */}
        {trending.length > 0 && (
          <Reveal as="up">
            <section className="py-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {t('home.trending')}
                  <span className="text-xl animate-float">🔥</span>
                </h2>
                <Link href="/shop?sortBy=price_desc" className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium underline-grow transition-colors">
                  {t('home.viewAll')}
                </Link>
              </div>
              {trendingLoading ? (
                <ProductGridSkeleton />
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:overflow-visible">
                  {trending.slice(0, 8).map((p, i) => (
                    <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                      <ProductCard product={p} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </Reveal>
        )}

        {/* Featured Artists */}
        {activeVendors.length > 0 && (
          <Reveal as="up">
            <section className="py-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('home.featuredArtists')}</h2>
                <Link href="/shop" className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium underline-grow transition-colors">
                  {t('home.seeAll')}
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {activeVendors.slice(0, 4).map((v: any, i: number) => (
                  <div key={v.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <ArtistCard vendor={v} />
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* Recently Viewed */}
        <RecentlyViewedSection />

        {/* Features */}
        <Reveal as="up">
          <section className="py-10 pb-16">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: <BagIcon />, titleKey: 'home.officialMerch', descKey: 'home.officialMerchDesc', color: 'text-purple-400' },
                { icon: <MusicIcon />, titleKey: 'home.stayUpdated', descKey: 'home.stayUpdatedDesc', color: 'text-pink-400' },
                { icon: <MicIcon />, titleKey: 'home.fanCommunity', descKey: 'home.fanCommunityDesc', color: 'text-red-400' },
              ].map((f, i) => (
                <div
                  key={f.titleKey}
                  className="card p-6 text-center card-hoverable group animate-fade-in-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className={`flex justify-center mb-3 ${f.color} group-hover:scale-110 group-hover:animate-float transition-transform duration-300`}>{f.icon}</div>
                  <h3 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-white">{t(f.titleKey)}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t(f.descKey)}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      </div>

      <Footer />
    </div>
  );
}


// ── Icons ─────────────────────────────────────────────────────────────────────

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function RecentlyViewedSection() {
  const t = useI18n((s) => s.t);
  const recentItems = useRecentlyViewed();

  if (recentItems.length === 0) return null;

  return (
    <section className="py-10">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('home.recentlyViewed')}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {recentItems.slice(0, 8).map((item) => (
          <Link
            key={item.id}
            href={`/product/${item.id}`}
            className="group flex flex-col overflow-hidden card hover:border-purple-500 dark:hover:border-purple-700 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 shrink-0 w-[180px]"
          >
            <div className="aspect-square overflow-hidden">
              {item.image ? (
                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: brandGradient(item.tenantSlug) }}>
                  <span className="text-4xl font-black text-white/20">{item.title?.[0] ?? '?'}</span>
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">{item.title}</h3>
              <p className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1">{formatPrice(item.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
