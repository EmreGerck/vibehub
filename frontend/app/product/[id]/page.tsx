import type { Metadata } from 'next';
import { ProductPageClient } from './ProductPageClient';

interface Props { params: { id: string } }

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

export default function ProductPage({ params }: Props) {
  return <ProductPageClient />;
}
