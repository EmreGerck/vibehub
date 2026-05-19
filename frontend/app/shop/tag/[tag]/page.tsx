'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useProducts } from '../../../../hooks/useProducts';
import { useI18n } from '../../../../lib/i18n';
import { formatPrice, brandGradient } from '../../../../lib/format';
import { Navbar } from '../../../../components/layout/Navbar';
import { Footer } from '../../../../components/layout/Footer';
import { Spinner } from '../../../../components/ui/Spinner';
import type { Product } from '../../../../types';

function ProductCard({ product }: { product: Product }) {
  const price = product.variants?.[0]?.priceOverride ?? product.price;
  const slug = product.tenant?.slug;
  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden card hover:border-purple-500 dark:hover:border-purple-700 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200"
    >
      <div className="aspect-square overflow-hidden relative">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: brandGradient(slug) }}>
            <span className="text-5xl font-black text-white/20">{product.title[0]}</span>
          </div>
        )}
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

export default function TagPage() {
  const { tag } = useParams<{ tag: string }>();
  const decodedTag = decodeURIComponent(tag);
  const t = useI18n((s) => s.t);
  const { data, isLoading } = useProducts({ tags: [decodedTag], limit: 50 });
  const products = data?.items ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/shop" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <p className="text-xs text-purple-500 dark:text-purple-400 font-semibold uppercase tracking-wider">{t('shop.tags')}</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{decodedTag}</h1>
          </div>
          <span className="ml-auto text-sm text-gray-500">{products.length} {products.length === 1 ? t('shop.product') : t('shop.products')}</span>
        </div>

        {isLoading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

        {!isLoading && products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('shop.noProducts')}</p>
            <Link href="/shop" className="btn-primary inline-flex mt-4">{t('home.viewAll')}</Link>
          </div>
        )}

        {products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
