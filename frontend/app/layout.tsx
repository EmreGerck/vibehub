import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import GoogleAnalytics from '../components/ui/GoogleAnalytics';

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
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
