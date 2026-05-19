'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '../../components/layout/Navbar';
import { useProducts } from '../../hooks/useProducts';
import { useVendors } from '../../hooks/useVendors';
import { useAddToCart } from '../../hooks/useCart';
import { useWishlistCheck, useToggleWishlist } from '../../hooks/useWishlist';
import { useAuthStore } from '../../store/auth.store';
import { toast } from '../../store/toast.store';
import { formatPrice, brandGradient } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { FilterSidebar, DEFAULT_FILTERS, countActiveFilters, type FilterValues } from '../../components/product/FilterSidebar';
import { ProductImage } from '../../components/ui/ProductImage';
import GifPlayer from '../../components/ui/GifPlayer';
import { useCategories } from '../../hooks/useCategories';
import type { Product } from '../../types';

const BENTO_LAYOUTS = [
  [
    'col-span-2 row-span-2',
    'col-span-1 row-span-1',
    'col-span-1 row-span-1',
    'col-span-1 row-span-1',
    'col-span-1 row-span-1',
  ],
  [
    'col-span-1 row-span-1',
    'col-span-1 row-span-1',
    'col-span-2 row-span-2',
    'col-span-2 row-span-1',
  ],
  [
    'col-span-3 row-span-1',
    'col-span-2 row-span-2',
    'col-span-1 row-span-1',
    'col-span-1 row-span-1',
  ],
];

function useShuffle<T>(items: T[], count: number, intervalMs: number): T[] {
  const [shuffled, setShuffled] = useState<T[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const reshuffle = useCallback(() => {
    const src = [...itemsRef.current];
    const result: T[] = [];
    const take = Math.min(count, src.length);
    for (let i = 0; i < take; i++) {
      const idx = Math.floor(Math.random() * src.length);
      result.push(src.splice(idx, 1)[0]);
    }
    setShuffled(result);
  }, [count]);

  useEffect(() => {
    if (items.length === 0) return;
    reshuffle();
    const id = setInterval(reshuffle, intervalMs);
    return () => clearInterval(id);
  }, [items.length, reshuffle, intervalMs]);

  return shuffled;
}

function BentoHero({ products }: { products: Product[] }) {
  const featured = useShuffle(products, 5, 6000);
  const [layoutIdx, setLayoutIdx] = useState(0);

  useEffect(() => {
    setLayoutIdx(Math.floor(Math.random() * BENTO_LAYOUTS.length));
  }, [featured]);

  if (featured.length === 0) return null;

  const layout = BENTO_LAYOUTS[layoutIdx % BENTO_LAYOUTS.length];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 auto-rows-[140px] sm:auto-rows-[180px] gap-3 animate-fade-in">
      {featured.slice(0, layout.length).map((product, i) => {
        const price = product.variants?.[0]?.priceOverride ?? product.price;
        const isLarge = layout[i].includes('span-2');
        return (
          <BentoCard
            key={`${product.id}-${i}`}
            product={product}
            price={price}
            isLarge={isLarge}
            layoutClass={layout[i]}
            hidden={i >= 3}
            delay={i * 70}
          />
        );
      })}
    </div>
  );
}

function BentoCard({ product, price, isLarge, layoutClass, hidden, delay }: {
  product: any; price: any; isLarge: boolean; layoutClass: string; hidden: boolean; delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  const fp = (product.imageSettings as any)?.[0];
  const objPos = fp ? `${fp.x}% ${fp.y}%` : '50% 50%';

  return (
    <Link
      href={`/product/${product.id}`}
      className={`relative group rounded-2xl overflow-hidden ${layoutClass} ${
        hidden ? 'hidden sm:block' : ''
      } animate-fade-in-up`}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute inset-0" style={{ background: brandGradient(product.tenant?.slug) }}>
        {product.previewVideoUrl ? (
          <GifPlayer
            src={product.previewVideoUrl}
            alt={product.title}
            poster={product.images?.[0]}
            isHovering={hovered}
            objectPosition={objPos}
            className="w-full h-full"
          />
        ) : product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className={`w-full h-full object-cover transition-all duration-[700ms] ease-out-expo ${
              hovered ? 'opacity-90 scale-110' : 'opacity-60 scale-100'
            }`}
            style={{ objectPosition: objPos }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className={`font-black text-white/15 ${isLarge ? 'text-[120px]' : 'text-[80px]'}`}>
              {product.title[0]}
            </span>
          </div>
        )}
      </div>

      <div className={`absolute inset-0 flex flex-col justify-end p-4 sm:p-5 bg-gradient-to-t from-black/80 via-black/10 to-transparent transition-transform duration-500 pointer-events-none ${
        hovered ? 'translate-y-0' : 'translate-y-1'
      }`}>
        {product.tenant && (
          <span className="text-purple-300 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1">
            {product.tenant.displayName}
          </span>
        )}
        <h3 className={`text-white font-bold leading-tight line-clamp-2 ${
          isLarge ? 'text-lg sm:text-2xl' : 'text-sm sm:text-base'
        }`}>
          {product.title}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <span className={`text-white font-bold ${isLarge ? 'text-xl' : 'text-sm'}`}>
            {formatPrice(price)}
          </span>
          <span className={`text-xs transition-all ${hovered ? 'text-white translate-x-1' : 'text-white/60'}`}>
            View →
          </span>
        </div>
      </div>

      <span className={`absolute inset-0 ring-2 rounded-2xl transition-all duration-300 pointer-events-none ${
        hovered ? 'ring-purple-500/40' : 'ring-transparent'
      }`} />
    </Link>
  );
}

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name';

const SORT_TO_BACKEND: Record<SortOption, string | undefined> = {
  newest: undefined,
  price_asc: 'price_asc',
  price_desc: 'price_desc',
  name: undefined,
};

function sortByName(products: Product[]): Product[] {
  return [...products].sort((a, b) => a.title.localeCompare(b.title));
}

export default function ShopPage() {
  return (
    <Suspense>
      <ShopContent />
    </Suspense>
  );
}

// ─── URL ↔ filter values ────────────────────────────────────────────────────
function valuesFromParams(params: URLSearchParams): FilterValues {
  const arr = (k: string) => params.get(k)?.split(',').filter(Boolean) ?? [];
  const num = (k: string) => {
    const v = params.get(k);
    return v ? Number(v) : undefined;
  };
  return {
    tenantId: params.get('vendor') || null,
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    tags: arr('tags'),
    sizes: arr('sizes'),
    colors: arr('colors'),
    gender: params.get('gender'),
    materials: arr('materials'),
    availability: (params.get('availability') as 'in' | 'out' | null) || null,
    rating: params.get('rating') ? Number(params.get('rating')) : null,
    onSale: params.get('sale') === '1',
    newOnly: params.get('new') === '1',
    trending: params.get('trending') === '1',
    limited: params.get('limited') === '1',
  };
}

function paramsFromValues(v: FilterValues): Record<string, string | null> {
  const csv = (a: string[]) => (a.length ? a.join(',') : null);
  const flag = (b: boolean) => (b ? '1' : null);
  return {
    vendor: v.tenantId,
    minPrice: v.minPrice != null ? String(v.minPrice) : null,
    maxPrice: v.maxPrice != null ? String(v.maxPrice) : null,
    tags: csv(v.tags),
    sizes: csv(v.sizes),
    colors: csv(v.colors),
    gender: v.gender,
    materials: csv(v.materials),
    availability: v.availability,
    rating: v.rating != null ? String(v.rating) : null,
    sale: flag(v.onSale),
    new: flag(v.newOnly),
    trending: flag(v.trending),
    limited: flag(v.limited),
  };
}

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useI18n((s) => s.t);

  const filters = useMemo(
    () => valuesFromParams(searchParams as unknown as URLSearchParams),
    [searchParams],
  );
  const sort = (searchParams.get('sort') as SortOption) || 'newest';
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const activeFilterCount = countActiveFilters(filters);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    router.push(`/shop?${params.toString()}`, { scroll: false });
  }

  function setFilters(next: FilterValues) {
    updateParams(paramsFromValues(next));
  }

  const { data: vendorsData } = useVendors({ limit: 50 });
  const vendors = vendorsData?.items ?? [];

  const { data: categoryList = [] } = useCategories();
  const selectedCategoryId = searchParams.get('categoryId') ?? '';

  function selectCategory(id: string) {
    updateParams({ categoryId: id || null });
  }

  const { data: productsData, isLoading: productsLoading } = useProducts({
    limit: 48,
    tenantId: filters.tenantId ?? undefined,
    sortBy: SORT_TO_BACKEND[sort],
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
    categoryId: selectedCategoryId || undefined,
  });
  const products = productsData?.items ?? [];

  // Client-side filtering for filters that aren't yet supported server-side
  const displayProducts = useMemo(() => {
    let list = products;
    if (filters.onSale) list = list.filter((p: any) => p.compareAtPrice != null && p.compareAtPrice > p.price);
    if (filters.newOnly) {
      const NEW_DAYS = 30;
      const cutoff = Date.now() - NEW_DAYS * 24 * 60 * 60 * 1000;
      list = list.filter((p) => new Date(p.createdAt).getTime() >= cutoff);
    }
    if (filters.availability === 'in') {
      list = list.filter((p) => p.variants?.some((v) => v.stockQty > 0));
    } else if (filters.availability === 'out') {
      list = list.filter((p) => !p.variants?.some((v) => v.stockQty > 0));
    }
    if (sort === 'name') list = sortByName(list);
    return list;
  }, [products, filters, sort]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    products.forEach((p) => p.tags?.forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [products]);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bento hero — only when showing all products with no filters */}
        {!hasActiveFilters && products.length >= 3 && (
          <div className="mb-10">
            <BentoHero products={products} />
          </div>
        )}

        {/* Category pill bar */}
        {categoryList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide animate-fade-in">
            <button
              onClick={() => selectCategory('')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
                !selectedCategoryId
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Tümü
            </button>
            {categoryList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
                  selectedCategoryId === cat.id
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat.icon && <span>{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Header + sort + filter toggle */}
        <div className="flex items-center justify-between gap-4 mb-6 animate-fade-in-down">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            {filters.tenantId
              ? vendors.find((v) => v.id === filters.tenantId)?.displayName ?? t('nav.shop')
              : t('shop.allMerchandise')}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className={`lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${
                hasActiveFilters
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FilterIcon />
              <span className="hidden sm:inline">{t('shop.filters')}</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white animate-pop">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <select
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value === 'newest' ? null : e.target.value })}
              className="input w-auto text-sm py-2 pr-8 shrink-0"
            >
              <option value="newest">{t('shop.newest')}</option>
              <option value="price_asc">{t('shop.priceLow')}</option>
              <option value="price_desc">{t('shop.priceHigh')}</option>
              <option value="name">{t('shop.nameAZ')}</option>
            </select>
          </div>
        </div>

        {/* Active filter pills */}
        {hasActiveFilters && (
          <ActivePills filters={filters} vendors={vendors} setFilters={setFilters} />
        )}

        <div className="flex gap-6 mt-6">
          {/* Desktop sidebar */}
          <FilterSidebar
            vendors={vendors}
            allTags={allTags}
            values={filters}
            onChange={setFilters}
          />

          {/* Main grid area */}
          <div className="flex-1 min-w-0">
            {/* Products grid */}
            {productsLoading && (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-gray-200 dark:bg-gray-800 aspect-[3/4] animate-shimmer"
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))}
              </div>
            )}

            {!productsLoading && displayProducts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-20 text-center animate-fade-in">
                <div className="text-5xl mb-3 animate-float">🔍</div>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">{t('shop.noProducts')}</p>
                {hasActiveFilters && (
                  <button
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="mt-4 btn-secondary text-sm py-1.5"
                  >
                    {t('shop.resetAll')}
                  </button>
                )}
              </div>
            )}

            {!productsLoading && displayProducts.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {displayProducts.map((p, i) => (
                  <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                    <ShopProductCard product={p} />
                  </div>
                ))}
              </div>
            )}

            {!productsLoading && displayProducts.length > 0 && (
              <p className="text-center text-sm text-gray-400 dark:text-gray-600 mt-10">
                {t('shop.showing')} {displayProducts.length} {t('shop.products')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <FilterSidebar
        mobile
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        vendors={vendors}
        allTags={allTags}
        values={filters}
        onChange={setFilters}
        resultsCount={displayProducts.length}
      />
    </div>
  );
}

function ActivePills({
  filters,
  vendors,
  setFilters,
}: {
  filters: FilterValues;
  vendors: { id: string; displayName: string }[];
  setFilters: (n: FilterValues) => void;
}) {
  const t = useI18n((s) => s.t);
  const pills: { label: string; clear: () => void }[] = [];

  if (filters.tenantId) {
    const v = vendors.find((v) => v.id === filters.tenantId);
    pills.push({ label: v?.displayName ?? 'Vendor', clear: () => setFilters({ ...filters, tenantId: null }) });
  }
  if (filters.minPrice != null) pills.push({ label: `≥ ${filters.minPrice}`, clear: () => setFilters({ ...filters, minPrice: undefined }) });
  if (filters.maxPrice != null) pills.push({ label: `≤ ${filters.maxPrice}`, clear: () => setFilters({ ...filters, maxPrice: undefined }) });
  filters.sizes.forEach((s) => pills.push({ label: s, clear: () => setFilters({ ...filters, sizes: filters.sizes.filter((x) => x !== s) }) }));
  filters.colors.forEach((c) => pills.push({ label: c, clear: () => setFilters({ ...filters, colors: filters.colors.filter((x) => x !== c) }) }));
  filters.materials.forEach((m) => pills.push({ label: m, clear: () => setFilters({ ...filters, materials: filters.materials.filter((x) => x !== m) }) }));
  if (filters.gender) pills.push({ label: filters.gender, clear: () => setFilters({ ...filters, gender: null }) });
  if (filters.availability) pills.push({ label: filters.availability === 'in' ? t('shop.inStock') : t('shop.outOfStock'), clear: () => setFilters({ ...filters, availability: null }) });
  if (filters.rating) pills.push({ label: `${filters.rating}★+`, clear: () => setFilters({ ...filters, rating: null }) });
  if (filters.onSale) pills.push({ label: t('shop.onSale'), clear: () => setFilters({ ...filters, onSale: false }) });
  if (filters.newOnly) pills.push({ label: t('shop.newArrivals'), clear: () => setFilters({ ...filters, newOnly: false }) });
  if (filters.trending) pills.push({ label: t('shop.trending'), clear: () => setFilters({ ...filters, trending: false }) });
  if (filters.limited) pills.push({ label: t('shop.limitedEdition'), clear: () => setFilters({ ...filters, limited: false }) });
  filters.tags.forEach((tag) => pills.push({ label: tag, clear: () => setFilters({ ...filters, tags: filters.tags.filter((x) => x !== tag) }) }));

  return (
    <div className="flex flex-wrap items-center gap-2 animate-fade-in">
      {pills.map((p, i) => (
        <button
          key={`${p.label}-${i}`}
          onClick={p.clear}
          className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all duration-200 active:scale-95 animate-pop"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          {p.label}
          <span className="text-purple-500 group-hover:text-red-500 group-hover:rotate-90 transition-all">×</span>
        </button>
      ))}
      <button
        onClick={() => setFilters(DEFAULT_FILTERS)}
        className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-1"
      >
        {t('shop.clearFilters')}
      </button>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

function ShopProductCard({ product }: { product: Product }) {
  const price = product.variants?.[0]?.priceOverride ?? product.price;
  const defaultVariant = product.variants?.[0];
  const addToCart = useAddToCart();
  const user = useAuthStore((s) => s.user);
  const { data: wishlistStatus } = useWishlistCheck(product.id, !!user);
  const toggleWishlist = useToggleWishlist();
  const isWishlisted = wishlistStatus?.wishlisted ?? false;
  const [pulsing, setPulsing] = useState(false);
  const [heartPulse, setHeartPulse] = useState(false);
  const [hovered, setHovered] = useState(false);

  function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const t = useI18n.getState().t;
    if (!user) {
      toast('info', t('wishlist.loginRequired'));
      return;
    }
    setHeartPulse(true);
    setTimeout(() => setHeartPulse(false), 600);
    toggleWishlist.mutate(product.id, {
      onSuccess: (data) => toast('success', data.added ? t('wishlist.added') : t('wishlist.removed')),
    });
  }

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast('info', useI18n.getState().t('shop.loginToAdd'));
      return;
    }
    if (!defaultVariant) return;
    setPulsing(true);
    setTimeout(() => setPulsing(false), 600);
    addToCart.mutate(
      { variantId: defaultVariant.id, qty: 1 },
      {
        onSuccess: () => {
          toast('success', `${product.title} ${useI18n.getState().t('shop.addedToCart')}`);
          window.dispatchEvent(new CustomEvent('cart:bump'));
        },
        onError: () => toast('error', useI18n.getState().t('shop.failedToAdd')),
      },
    );
  }

  const fp = (product.imageSettings as any)?.[0];
  const objPos = fp ? `${fp.x}% ${fp.y}%` : '50% 50%';

  return (
    <Link
      href={`/product/${product.id}`}
      className="flex flex-col rounded-2xl overflow-hidden card card-hoverable group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="aspect-square overflow-hidden relative">
        {product.previewVideoUrl ? (
          <GifPlayer
            src={product.previewVideoUrl}
            alt={product.title}
            poster={product.images?.[0]}
            isHovering={hovered}
            objectPosition={objPos}
            className="w-full h-full"
          />
        ) : product.images?.[0] ? (
          <ProductImage
            src={product.images[0]}
            alt={product.title}
            tenantSlug={product.tenant?.slug}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[600ms] ease-out-expo"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: brandGradient(product.tenant?.slug) }}
          >
            <span className="text-6xl font-black text-white/20 group-hover:text-white/30 group-hover:scale-110 transition-all duration-500">
              {product.title[0]}
            </span>
          </div>
        )}

        {/* Shimmer overlay on hover */}
        <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/0 group-hover:via-white/10 group-hover:to-white/0 transition-all duration-700 pointer-events-none" />

        {/* Wishlist heart */}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 dark:bg-gray-900/80 backdrop-blur shadow-md text-gray-600 dark:text-gray-300 transition-all duration-200 hover:scale-110 active:scale-90 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0"
          aria-label="Toggle wishlist"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={isWishlisted ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-colors duration-200 ${isWishlisted ? 'text-red-500' : 'hover:text-red-400'} ${heartPulse ? 'animate-heart-pop' : ''}`}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {defaultVariant && (
          <button
            onClick={handleQuickAdd}
            className={`absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-lg text-gray-700 dark:text-gray-200 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-purple-600 hover:text-white hover:scale-110 active:scale-95 ${pulsing ? 'animate-cart-bump' : ''}`}
            aria-label="Quick add to cart"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-1.5 flex-1">
        {product.tenant && (
          <p className="text-[11px] text-purple-500 dark:text-purple-400 font-semibold uppercase tracking-wider">
            {product.tenant.displayName}
          </p>
        )}
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
          {product.title}
        </h3>
        <div className="mt-auto pt-2 flex items-end justify-between">
          <span className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(price)}</span>
          <span className="text-xs text-purple-500 dark:text-purple-400 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
