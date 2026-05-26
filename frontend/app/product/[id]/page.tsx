import type { Metadata } from 'next';
import { ProductPageClient } from './ProductPageClient';
import { JsonLd } from '../../../components/seo/JsonLd';

interface Props { params: { id: string } }

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://vibehub.com.tr';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-26a7.up.railway.app';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-26a7.up.railway.app';
    const res = await fetch(
      `${apiBase}/products/${params.id}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error('not found');
    const json = await res.json();
    const product = json?.data;

    const title = product?.title ?? 'Product';
    const description = product?.description
      ? product.description.slice(0, 155)
      : `Buy ${title} on VibeHub.`;
    const image = product?.images?.[0] ?? undefined;
    const price = product?.price;
    const currency = product?.currency ?? 'TRY';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        ...(image ? { images: [{ url: image }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
      other: price ? {
        'product:price:amount': String(price),
        'product:price:currency': currency,
      } : {},
    };
  } catch {
    return { title: 'Product' };
  }
}

/** Pre-render top 200 products at build time for instant LCP. */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-26a7.up.railway.app';
    const res = await fetch(`${apiBase}/products?limit=200&page=1`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data?.items ?? []).map((p: { id: string }) => ({ id: p.id }));
  } catch {
    return [];
  }
}

async function getProductJsonLd(id: string) {
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    const product = json?.data;
    if (!product) return null;

    const price = product.variants?.[0]?.priceOverride ?? product.price;
    const inStock = product.variants?.some((v: any) => v.stockQty > 0) ?? false;
    const vendorName = product.tenant?.displayName ?? 'VibeHub';
    const vendorSlug = product.tenant?.slug;

    const productSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description?.slice(0, 500) ?? `Buy ${product.title} on VibeHub.`,
      ...(product.images?.[0] ? { image: product.images[0] } : {}),
      brand: { '@type': 'Organization', name: vendorName },
      offers: {
        '@type': 'Offer',
        price: price ?? 0,
        priceCurrency: product.currency ?? 'TRY',
        availability: inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url: `${SITE_URL}/product/${id}`,
      },
    };

    // Fetch review stats for aggregateRating
    try {
      const statsRes = await fetch(`${API_BASE}/reviews/stats/${id}`, { next: { revalidate: 300 } });
      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        const stats = statsJson?.data;
        if (stats?.count > 0) {
          productSchema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: stats.average,
            reviewCount: stats.count,
          };
        }
      }
    } catch { /* skip rating if unavailable */ }

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        ...(vendorSlug
          ? [{ '@type': 'ListItem', position: 2, name: vendorName, item: `${SITE_URL}/store/${vendorSlug}` }]
          : []),
        { '@type': 'ListItem', position: vendorSlug ? 3 : 2, name: product.title },
      ],
    };

    return { productSchema, breadcrumbSchema };
  } catch {
    return null;
  }
}

export default async function ProductPage({ params }: Props) {
  const jsonLd = await getProductJsonLd(params.id);

  return (
    <>
      {jsonLd && (
        <>
          <JsonLd data={jsonLd.productSchema} />
          <JsonLd data={jsonLd.breadcrumbSchema} />
        </>
      )}
      <ProductPageClient />
    </>
  );
}
