import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibehub.com.tr';

export const metadata: Metadata = {
  title: 'Hakkımızda — VibeHub',
  description: 'VibeHub, Türkiye\'nin sanatçı merch platformu. Sanatçılar ve hayranlarını buluşturuyoruz. Resmi ürünler, özel koleksiyonlar, sınırlı sayıda baskılar.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'Hakkımızda — VibeHub',
    description: 'Türkiye\'nin sanatçı merch platformu. Sanatçılar ve hayranlarını buluşturuyoruz.',
    url: `${SITE_URL}/about`,
    type: 'website',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
