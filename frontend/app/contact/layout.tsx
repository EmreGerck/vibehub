import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibehub.com.tr';

export const metadata: Metadata = {
  title: 'İletişim',
  description: 'VibeHub ile iletişime geçin. Sorularınız, önerileriniz veya satıcı başvurularınız için bize ulaşın.',
  // hreflang alternates — TR canonical + EN via ?lang=en (until /en/* routes ship).
  alternates: {
    canonical: `${SITE_URL}/contact`,
    languages: {
      tr: `${SITE_URL}/contact`,
      'tr-TR': `${SITE_URL}/contact`,
      en: `${SITE_URL}/contact?lang=en`,
      'x-default': `${SITE_URL}/contact`,
    },
  },
  openGraph: {
    title: 'İletişim — VibeHub',
    description: 'VibeHub ile iletişime geçin. Sorularınız ve önerileriniz için bize ulaşın.',
    url: `${SITE_URL}/contact`,
    siteName: 'VibeHub',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'İletişim — VibeHub' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'İletişim — VibeHub',
    description: 'VibeHub ile iletişime geçin.',
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
