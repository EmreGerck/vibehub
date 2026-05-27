import type { Metadata } from 'next';
import { StorePageClient } from './StorePageClient';
import { JsonLd } from '../../../components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://vibehub.com.tr';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vibehub.com.tr/api';

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const res = await fetch(
      `${API_BASE}/vendors/slug/${params.slug}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error('not found');
    const json = await res.json();
    const vendor = json?.data;

    const title = vendor?.displayName ?? params.slug;
    const description = vendor?.bio
      ? vendor.bio.slice(0, 155)
      : `${title} resmi mağazası — VibeHub'da satın al.`;
    const image = vendor?.bannerUrl ?? vendor?.logoUrl ?? undefined;

    return {
      title,
      description,
      keywords: [title, 'resmi mağaza', 'merch', 'vibehub'],
      alternates: { canonical: `${SITE_URL}/store/${params.slug}` },
      openGraph: {
        title: `${title} Resmi Mağazası | VibeHub`,
        description,
        type: 'website',
        url: `${SITE_URL}/store/${params.slug}`,
        ...(image ? { images: [{ url: image, alt: `${title} mağaza görseli` }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} Resmi Mağazası | VibeHub`,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return { title: params.slug };
  }
}

/** Pre-render all active vendor store pages at build time. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const res = await fetch(`${API_BASE}/vendors?limit=500&page=1`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data?.items ?? []).map((v: { slug: string }) => ({ slug: v.slug }));
  } catch {
    return [];
  }
}

async function getVendorJsonLd(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/vendors/slug/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    const vendor = json?.data;
    if (!vendor) return null;

    // Map our ArtistType enum → schema.org @type for richer SERP / Knowledge Panel
    const artistType = vendor.artistType as 'BAND' | 'ARTIST' | 'COMEDIAN' | 'INFLUENCER' | 'OTHER' | undefined;
    const schemaType =
      artistType === 'BAND' || artistType === 'ARTIST' ? 'MusicGroup' :
      artistType === 'COMEDIAN' || artistType === 'INFLUENCER' ? 'Person' :
      'Organization';

    // Collect social links into sameAs (helps Google build the Knowledge Panel)
    const sameAs: string[] = [];
    if (vendor.instagramHandle) sameAs.push(`https://instagram.com/${vendor.instagramHandle.replace('@', '')}`);
    if (vendor.twitterHandle)   sameAs.push(`https://twitter.com/${vendor.twitterHandle.replace('@', '')}`);
    if (vendor.spotifyUrl)      sameAs.push(vendor.spotifyUrl);
    if (vendor.youtubeUrl)      sameAs.push(vendor.youtubeUrl);
    if (vendor.websiteUrl)      sameAs.push(vendor.websiteUrl);

    const baseSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      name: vendor.displayName,
      url: `${SITE_URL}/store/${slug}`,
      ...(vendor.logoUrl   ? { logo:  { '@type': 'ImageObject', url: vendor.logoUrl } } : {}),
      ...(vendor.bannerUrl ? { image: vendor.bannerUrl } : {}),
      ...(vendor.bio       ? { description: vendor.bio.slice(0, 500) } : {}),
      ...(sameAs.length    ? { sameAs } : {}),
    };

    // MusicGroup-specific enrichments
    if (schemaType === 'MusicGroup') {
      if (vendor.genre)    baseSchema.genre = vendor.genre;
      if (vendor.foundedAt) baseSchema.foundingDate = vendor.foundedAt;
    }

    return baseSchema;
  } catch {
    return null;
  }
}

export default async function StorePage({ params }: Props) {
  const jsonLd = await getVendorJsonLd(params.slug);

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <StorePageClient />
    </>
  );
}
