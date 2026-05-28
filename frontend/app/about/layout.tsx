import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibehub.com.tr';

export const metadata: Metadata = {
  title: 'Hakkımızda — VibeHub',
  description: 'VibeHub, Türkiye\'nin sanatçı merch platformu. Sanatçılar ve hayranlarını buluşturuyoruz. Resmi ürünler, özel koleksiyonlar, sınırlı sayıda baskılar.',
  // hreflang alternates — TR canonical + EN via ?lang=en (until /en/* routes ship).
  alternates: {
    canonical: `${SITE_URL}/about`,
    languages: {
      tr: `${SITE_URL}/about`,
      'tr-TR': `${SITE_URL}/about`,
      en: `${SITE_URL}/about?lang=en`,
      'x-default': `${SITE_URL}/about`,
    },
  },
  openGraph: {
    title: 'Hakkımızda — VibeHub',
    description: 'Türkiye\'nin sanatçı merch platformu. Sanatçılar ve hayranlarını buluşturuyoruz.',
    url: `${SITE_URL}/about`,
    siteName: 'VibeHub',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'Hakkımızda — VibeHub' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hakkımızda — VibeHub',
    description: 'Türkiye\'nin sanatçı merch platformu.',
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
