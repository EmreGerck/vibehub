import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibehub.com.tr';

export const metadata: Metadata = {
  title: 'Mağaza — Sanatçı Ürünleri',
  description: 'Türkiye\'nin en sevilen sanatçılarından t-shirt, hoodie, aksesuar ve özel koleksiyon ürünleri. Tüm ürünler resmi ve sertifikalı.',
  alternates: {
    canonical: `${SITE_URL}/shop`,
  },
  openGraph: {
    title: 'VibeHub Mağaza — Sanatçı Ürünleri',
    description: 'Türkiye\'nin en sevilen sanatçılarından t-shirt, hoodie, aksesuar ve özel koleksiyon ürünleri.',
    url: `${SITE_URL}/shop`,
    type: 'website',
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
