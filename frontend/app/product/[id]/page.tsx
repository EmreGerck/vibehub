import type { Metadata } from 'next';
import { ProductPageClient } from './ProductPageClient';
import { JsonLd } from '../../../components/seo/JsonLd';
import { ProductFaqJsonLd } from '../../../components/seo/ProductFaqJsonLd';

interface Props { params: { id: string } }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://vibehub.com.tr';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vibehub.com.tr/api';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://vibehub.com.tr/api';
    const res = await fetch(
      `${apiBase}/products/${params.id}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error('not found');
    const json = await res.json();
    const product = json?.data;

    const title = product?.title ?? 'Ürün';
    const vendorName = product?.tenant?.displayName ?? 'VibeHub';
    const description = product?.description
      ? product.description.slice(0, 155)
      : `${title} — ${vendorName} resmi ürünü. VibeHub'da satın al.`;
    const image = product?.images?.[0] ?? undefined;
    const price = product?.price;
    const currency = product?.currency ?? 'TRY';

    const pathTr = `${SITE_URL}/product/${params.id}`;
    return {
      title,
      description,
      keywords: [title, vendorName, 'resmi ürün', 'merch', 'vibehub'],
      // hreflang alternates — TR canonical + EN via ?lang=en (until /en/* routes ship).
      alternates: {
        canonical: pathTr,
        languages: {
          tr: pathTr,
          'tr-TR': pathTr,
          en: `${pathTr}?lang=en`,
          'x-default': pathTr,
        },
      },
      openGraph: {
        title: `${title} — ${vendorName} | VibeHub`,
        description,
        // Note: Next.js Metadata API only accepts a limited set of og:type values
        // ('website', 'article', 'book', 'profile', 'music.*', 'video.*'). For
        // 'product' specifically we emit it as a raw property below via `other`,
        // which is what Facebook's Product card actually reads.
        type: 'website',
        url: pathTr,
        siteName: 'VibeHub',
        locale: 'tr_TR',
        ...(image
          ? {
              // OG images should be absolute URLs — if upstream returned a
              // relative path, prepend SITE_URL so crawlers can fetch it.
              images: [{
                url: image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`,
                width: 800,
                height: 800,
                alt: title,
              }],
            }
          : { images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: title }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} — ${vendorName} | VibeHub`,
        description,
        ...(image
          ? { images: [image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`] }
          : { images: [`${SITE_URL}/opengraph-image`] }),
      },
      other: {
        // og:type=product for Facebook Product Card (overrides default 'website')
        'og:type': 'product',
        ...(price ? {
          'product:price:amount': String(price),
          'product:price:currency': currency,
          'product:availability': 'in stock',
          'product:brand': vendorName,
        } : {}),
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

/** Pre-render top 200 products at build time for instant LCP. */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://vibehub.com.tr/api';
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
    const artistType = product.tenant?.artistType as 'BAND' | 'ARTIST' | 'COMEDIAN' | 'INFLUENCER' | 'OTHER' | undefined;

    // Choose schema.org @type for brand based on vendor's artistType.
    // MusicGroup → bands/musicians get richer Google Knowledge Panel treatment.
    // Person     → comedians and influencers are individuals.
    // Organization → safe default for unspecified or "OTHER".
    const brandType =
      artistType === 'BAND' || artistType === 'ARTIST' ? 'MusicGroup' :
      artistType === 'COMEDIAN' || artistType === 'INFLUENCER' ? 'Person' :
      'Organization';

    const productSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description?.slice(0, 500) ?? `${product.title} — ${vendorName} resmi ürünü. VibeHub'da satın al.`,
      ...(product.images?.[0] ? { image: product.images } : {}),
      sku: product.sku ?? product.id,
      mpn: product.id,
      ...(product.categoryId ? { category: product.category?.name } : {}),
      brand: { '@type': brandType, name: vendorName },
      offers: {
        '@type': 'Offer',
        price: price ?? 0,
        priceCurrency: product.currency ?? 'TRY',
        availability: inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        url: `${SITE_URL}/product/${id}`,
        seller: { '@type': brandType, name: vendorName },
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
        { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Mağaza', item: `${SITE_URL}/shop` },
        ...(vendorSlug
          ? [{ '@type': 'ListItem', position: 3, name: vendorName, item: `${SITE_URL}/store/${vendorSlug}` }]
          : []),
        { '@type': 'ListItem', position: vendorSlug ? 4 : 3, name: product.title },
      ],
    };

    return {
      productSchema,
      breadcrumbSchema,
      faqContext: {
        productTitle: product.title,
        vendorName,
        categorySlug: product.category?.slug,
        isPreOrder: !!product.isPreOrder,
      },
    };
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
          <ProductFaqJsonLd {...jsonLd.faqContext} />
        </>
      )}
      <ProductPageClient />
    </>
  );
}
