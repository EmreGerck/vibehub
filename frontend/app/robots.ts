/**
 * robots.ts — Next.js 14 App Router
 * ────────────────────────────────────
 * Allows crawling of public pages, blocks admin/dashboard/API paths.
 */

import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://vibehub.com.tr';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/shop',
          '/shop/',
          '/product/',
          '/store/',
          '/about',
          '/contact',
          '/legal/',
          '/events',
        ],
        disallow: [
          '/dashboard/',
          '/api/',
          '/admin/',
          '/_next/',
          '/checkout',
          '/cart',
          '/auth/',
          '/onboarding',
        ],
      },
      // Block AI training scrapers (optional)
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host:    SITE_URL,
  };
}
