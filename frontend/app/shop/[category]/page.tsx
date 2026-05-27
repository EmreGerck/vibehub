/**
 * Clean category URLs: /shop/t-shirt → /shop?categorySlug=t-shirt
 * This server component redirects to the shop with the category filter
 * pre-applied, while also providing proper SEO metadata per category.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibehub.com.tr';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vibehub.com.tr/api';

interface Props { params: { category: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = params.category;
  try {
    const res = await fetch(`${API_BASE}/categories`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = await res.json();
      const cats: any[] = json?.data ?? [];
      const cat = cats.find((c: any) => c.slug === slug);
      if (cat) {
        return {
          title: `${cat.name} — VibeHub`,
          description: `${cat.name} kategorisindeki sanatçı ürünlerini keşfet. Resmi merch, koleksiyonlar ve özel baskılar.`,
          alternates: { canonical: `${SITE_URL}/shop/${slug}` },
          openGraph: {
            title: `${cat.name} | VibeHub Mağaza`,
            description: `${cat.name} kategorisindeki sanatçı ürünlerini keşfet.`,
            url: `${SITE_URL}/shop/${slug}`,
          },
        };
      }
    }
  } catch { /* fall through */ }
  return {
    title: `${slug} — VibeHub`,
    alternates: { canonical: `${SITE_URL}/shop/${slug}` },
  };
}

/** Pre-render all category pages at build time */
export async function generateStaticParams(): Promise<{ category: string }[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data ?? []).map((c: { slug: string }) => ({ category: c.slug }));
  } catch {
    return [];
  }
}

export default function CategoryPage({ params }: Props) {
  // Redirect to shop with category filter — the shop page handles all state
  redirect(`/shop?categorySlug=${encodeURIComponent(params.category)}`);
}
