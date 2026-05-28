import type { Metadata } from 'next';
import { JsonLd } from '../../components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibehub.com.tr';
const API_URL  = process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:3001';

export const metadata: Metadata = {
  title: 'Mağaza — Sanatçı Ürünleri',
  description: 'Türkiye\'nin en sevilen sanatçılarından t-shirt, hoodie, aksesuar ve özel koleksiyon ürünleri. Tüm ürünler resmi ve sertifikalı.',
  // hreflang alternates — TR canonical + EN via ?lang=en (until /en/* routes ship).
  alternates: {
    canonical: `${SITE_URL}/shop`,
    languages: {
      tr: `${SITE_URL}/shop`,
      'tr-TR': `${SITE_URL}/shop`,
      en: `${SITE_URL}/shop?lang=en`,
      'x-default': `${SITE_URL}/shop`,
    },
  },
  openGraph: {
    title: 'VibeHub Mağaza — Sanatçı Ürünleri',
    description: 'Türkiye\'nin en sevilen sanatçılarından t-shirt, hoodie, aksesuar ve özel koleksiyon ürünleri.',
    url: `${SITE_URL}/shop`,
    siteName: 'VibeHub',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'VibeHub Mağaza' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VibeHub Mağaza — Sanatçı Ürünleri',
    description: 'Türkiye\'nin en sevilen sanatçılarından t-shirt, hoodie, aksesuar ve özel koleksiyon ürünleri.',
    images: [`${SITE_URL}/opengraph-image`],
  },
};

/**
 * Fetch the first page of LIVE products to populate ItemList JSON-LD.
 * Cached for 1 hour. Failure falls back silently — JSON-LD just omitted.
 */
async function fetchTopProducts() {
  try {
    const res = await fetch(`${API_URL}/products?limit=24&page=1`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data?.items ?? []) as Array<{
      id: string;
      title: string;
      price: number;
      currency?: string;
      images?: string[];
      tenant?: { displayName?: string };
    }>;
  } catch {
    return [];
  }
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const products = await fetchTopProducts();

  // CollectionPage + ItemList — boosts category SERP appearance and helps
  // Google understand /shop is an inventory page (not a transactional one).
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'VibeHub Mağaza',
    url: `${SITE_URL}/shop`,
    description: 'Türkiye\'nin en sevilen sanatçılarından resmi merch ürünleri.',
    isPartOf: { '@type': 'WebSite', name: 'VibeHub', url: SITE_URL },
  };

  const itemListSchema = products.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: products.slice(0, 20).map((p, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `${SITE_URL}/product/${p.id}`,
          name: p.title,
        })),
      }
    : null;

  return (
    <>
      <JsonLd data={collectionSchema} />
      {itemListSchema && <JsonLd data={itemListSchema} />}
      {children}
    </>
  );
}
