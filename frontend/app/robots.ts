/**
 * robots.ts — Next.js 14 App Router
 * ────────────────────────────────────
 * Serves /robots.txt. Content is editable from the admin SEO panel
 * (stored in PlatformSettings.robotsTxt). Falls back to safe defaults.
 */

import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic'; // always fresh — robots.txt must reflect latest settings

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibehub.com.tr';
const API_URL  = process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:3001';

/** Parse a raw robots.txt string into the Next.js MetadataRoute.Robots format. */
function parseRobotsTxt(raw: string): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots['rules'] = [];
  let sitemap: string | undefined;
  let host: string | undefined;

  const blocks = raw.split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    let userAgent: string[] = [];
    const allow: string[] = [];
    const disallow: string[] = [];
    for (const line of lines) {
      const [key, ...rest] = line.split(':');
      const val = rest.join(':').trim();
      if (!val) continue;
      const k = key.trim().toLowerCase();
      if (k === 'user-agent') userAgent.push(val);
      else if (k === 'allow') allow.push(val);
      else if (k === 'disallow') disallow.push(val);
      else if (k === 'sitemap') sitemap = val;
      else if (k === 'host') host = val;
    }
    if (userAgent.length > 0) {
      rules.push({
        userAgent: userAgent.length === 1 ? userAgent[0] : userAgent,
        ...(allow.length ? { allow } : {}),
        ...(disallow.length ? { disallow } : {}),
      } as any);
    }
  }

  return { rules, ...(sitemap ? { sitemap } : {}), ...(host ? { host } : {}) };
}

const DEFAULT_ROBOTS: MetadataRoute.Robots = {
  rules: [
    {
      userAgent: '*',
      allow: ['/', '/shop', '/shop/', '/product/', '/store/', '/about', '/contact', '/legal/', '/events'],
      disallow: ['/dashboard/', '/api/', '/admin/', '/_next/', '/checkout', '/cart', '/auth/'],
    },
    { userAgent: 'GPTBot', disallow: ['/'] },
    { userAgent: 'CCBot',  disallow: ['/'] },
  ],
  sitemap: `${SITE_URL}/sitemap.xml`,
  host:    SITE_URL,
};

export default async function robots(): Promise<MetadataRoute.Robots> {
  try {
    const res = await fetch(`${API_URL}/platform/seo`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const rawRobots: string | null = json?.data?.robotsTxt;
      if (rawRobots && rawRobots.trim()) {
        return parseRobotsTxt(rawRobots);
      }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_ROBOTS;
}
