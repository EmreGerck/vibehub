import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import GoogleAnalytics from '../components/ui/GoogleAnalytics';
import { JsonLd } from '../components/seo/JsonLd';

// next/font self-hosts the font + eliminates render-blocking external request.
// Direct LCP improvement — Lighthouse usually shows ~200ms gain on first load.
const inter = Inter({
  subsets: ['latin', 'latin-ext'], // latin-ext covers Turkish characters (ş, ı, ğ, ü, ö, ç)
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://vibehub.com.tr';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchSeoSettings() {
  try {
    const res = await fetch(`${API_URL}/platform/seo`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (err) {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await fetchSeoSettings();

  const title = seo?.metaTitle || 'VibeHub — Sanatçıların Resmi Ürünleri | Sahnen Senin';
  const description = seo?.metaDescription || 'Türkiye\'nin en sevilen sanatçılarından resmi koleksiyon ürünleri. VibeHub\'da sanatçınıza destek ol, sahneyi paylaş.';
  const ogImage = seo?.ogImageUrl || `${SITE_URL}/opengraph-image`;
  const twitterHandle = seo?.twitterHandle || '@vibehub_tr';

  return {
    title: {
      default: title,
      template: '%s | VibeHub',
    },
    description,
    metadataBase: new URL(SITE_URL),
    manifest: '/manifest.json',
    keywords: ['sanatçı merch', 'resmi ürünler', 'band tişört', 'müzisyen koleksiyonu', 'vibehub', 'türk sanatçı'],
    authors: [{ name: 'VibeHub', url: SITE_URL }],
    creator: 'VibeHub',
    publisher: 'VibeHub',
    alternates: {
      canonical: SITE_URL,
      // hreflang advertises TR + EN variants to Google.
      // TODO: When dedicated /en/* routes ship, swap ?lang=en for /en path-prefixed URLs.
      languages: {
        tr: SITE_URL,
        'tr-TR': SITE_URL,
        en: `${SITE_URL}/?lang=en`,
        'x-default': SITE_URL,
      },
    },
    openGraph: {
      type: 'website',
      siteName: seo?.platformName || 'VibeHub',
      locale: 'tr_TR',
      title,
      description,
      url: SITE_URL,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      site: twitterHandle,
      creator: twitterHandle,
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    verification: {
      google: 'kTCPPYjNz-s5VR4m49rTbuakkmDgijHBv64WV7QO0ow',
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const seo = await fetchSeoSettings();

  // Optionally parse the DB schema string to object if it's valid JSON
  let customSchema = null;
  if (seo?.schemaOrgJson) {
    try {
      customSchema = JSON.parse(seo.schemaOrgJson);
    } catch {
      // Invalid JSON in DB, ignore
    }
  }

  return (
    <html lang="tr" className={inter.variable} suppressHydrationWarning>
      <head>
        <GoogleAnalytics gtmId={seo?.googleTagManagerId} />
        
        {/* Default Organization Schema */}
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: seo?.platformName || 'VibeHub',
            url: SITE_URL,
            // Google Rich Results prefers raster (PNG/JPG). Falls back to
            // SVG (auto-served from app/icon.svg) until icon-512.png is generated.
            logo: {
              '@type': 'ImageObject',
              url: `${SITE_URL}/icon-512.png`,
              width: 512,
              height: 512,
              caption: 'VibeHub',
            },
            description: seo?.metaDescription || 'Türkiye\'nin sanatçı merch platformu. Sanatçıların resmi ürünlerini satın alın.',
            contactPoint: {
              '@type': 'ContactPoint',
              email: 'support@vibehub.com.tr',
              contactType: 'customer service',
              availableLanguage: ['Turkish', 'English'],
            },
            sameAs: seo?.twitterHandle 
              ? ['https://instagram.com/vibehub_tr', `https://twitter.com/${seo.twitterHandle.replace('@', '')}`]
              : ['https://instagram.com/vibehub_tr'],
          }}
        />
        
        {/* Default WebSite Schema */}
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: seo?.platformName || 'VibeHub',
            url: SITE_URL,
            inLanguage: 'tr-TR',
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

        {/* Custom Schema from DB */}
        {customSchema && <JsonLd data={customSchema} />}
      </head>
      <body className={`${inter.className} pb-16 sm:pb-0`}>
        {/* Skip-to-content link — visually hidden until keyboard focus.
            WCAG 2.4.1 (Bypass Blocks): assistive-tech users can jump past nav. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-purple-600 focus:text-white focus:font-semibold focus:shadow-lg"
        >
          İçeriğe geç
        </a>
        <Providers>
          {/* div wrapper instead of <main> to avoid nesting conflicts with
              per-page <main> elements (privacy, terms, admin/vendor/profile layouts) */}
          <div id="main-content">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
