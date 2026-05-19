import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import GoogleAnalytics from '../components/ui/GoogleAnalytics';

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://vibehub.com.tr';
const OG_IMAGE = `${SITE_URL}/og-default.png`;

export const metadata: Metadata = {
  title: {
    default: 'VibeHub',
    template: '%s | VibeHub',
  },
  description: 'The merch marketplace for artists, bands, comedians, and influencers.',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    siteName: 'VibeHub',
    title: 'VibeHub',
    description: 'The merch marketplace for artists, bands, comedians, and influencers.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'VibeHub' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VibeHub',
    description: 'The merch marketplace for artists, bands, comedians, and influencers.',
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
