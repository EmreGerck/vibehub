import type { Metadata } from 'next';
import { StorePageClient } from './StorePageClient';

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-26a7.up.railway.app';
    const res = await fetch(
      `${apiBase}/vendors/slug/${params.slug}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error('not found');
    const json = await res.json();
    const vendor = json?.data;

    const title = vendor?.displayName ?? params.slug;
    const description = vendor?.bio
      ? vendor.bio.slice(0, 155)
      : `Shop official merch from ${title} on VibeHub.`;
    const image = vendor?.bannerUrl ?? vendor?.logoUrl ?? undefined;

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
    };
  } catch {
    return { title: params.slug };
  }
}

export default function StorePage({ params }: Props) {
  return <StorePageClient />;
}
