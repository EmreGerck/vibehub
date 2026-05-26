import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import GoogleAnalytics from '../components/ui/GoogleAnalytics';
import { JsonLd } from '../components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://vibehub.com.tr';

export const metadata: Metadata = {
  title: {
    default: 'VibeHub',
    template: '%s | VibeHub',
  },
  description: 'The merch marketplace for artists, bands, comedians, and influencers.',
  metadataBase: new URL(SITE_URL),
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    siteName: 'VibeHub',
    title: 'VibeHub',
    description: 'The merch marketplace for artists, bands, comedians, and influencers.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VibeHub',
    description: 'The merch marketplace for artists, bands, comedians, and influencers.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <GoogleAnalytics />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'VibeHub',
            url: SITE_URL,
            logo: `${SITE_URL}/icon.svg`,
            description: 'The merch marketplace for artists, bands, comedians, and influencers.',
          }}
        />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'VibeHub',
            url: SITE_URL,
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_URL}/shop?search={search_term_string}`,
              },
              'query-input': 'required name=search_term_string',
            },
          }}
        />
      </head>
      <body className="pb-16 sm:pb-0">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
