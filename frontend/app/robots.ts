/**
 * robots.ts — Next.js 14 App Router
 * ────────────────────────────────────
 * Serves /robots.txt. Content is editable from the admin SEO panel
 * (stored in PlatformSettings.robotsTxt). Falls back to safe defaults.
 *
 * GEO/AEO: AI crawlers are EXPLICITLY ALLOWED so VibeHub can surface
 * in ChatGPT, Gemini, Claude, Perplexity, and Meta AI answers.
 * If Cloudflare's managed robots.txt overrides this, disable it under
 * Cloudflare dashboard → Scrape Shield → Robots.txt.
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

// Shared private-path block list — never index dashboard/api/auth/cart/checkout
const PRIVATE_PATHS = ['/dashboard/', '/api/', '/admin/', '/_next/', '/checkout', '/cart', '/auth/'];
const PUBLIC_PATHS  = ['/', '/shop', '/shop/', '/product/', '/store/', '/about', '/contact', '/legal/', '/events', '/rehber/', '/support'];

const DEFAULT_ROBOTS: MetadataRoute.Robots = {
  rules: [
    // ── Default: any crawler not explicitly listed ─────────────────────────────
    { userAgent: '*', allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },

    // ── Search engines — full access ──────────────────────────────────────────
    { userAgent: 'Googlebot',         allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
    { userAgent: 'Bingbot',           allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
    { userAgent: 'YandexBot',         allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
    { userAgent: 'DuckDuckBot',       allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },

    // ── AI crawlers — ALLOW for GEO/AEO visibility ────────────────────────────
    // Allowing these lets VibeHub appear in ChatGPT/Gemini/Claude/Perplexity answers
    { userAgent: 'GPTBot',            allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // OpenAI / ChatGPT
    { userAgent: 'ChatGPT-User',      allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // ChatGPT browse
    { userAgent: 'OAI-SearchBot',     allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // OpenAI search index
    { userAgent: 'Google-Extended',   allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // Gemini / Google AI training
    { userAgent: 'ClaudeBot',         allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // Anthropic / Claude
    { userAgent: 'Claude-Web',        allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // Claude browse
    { userAgent: 'anthropic-ai',      allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // Anthropic legacy
    { userAgent: 'PerplexityBot',     allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // Perplexity
    { userAgent: 'Perplexity-User',   allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
    { userAgent: 'meta-externalagent',allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // Meta AI / Llama
    { userAgent: 'Applebot',          allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // Apple/Siri
    { userAgent: 'Applebot-Extended', allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // Apple Intelligence
    { userAgent: 'cohere-ai',         allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
    { userAgent: 'YouBot',            allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // you.com
    { userAgent: 'CCBot',             allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS }, // CommonCrawl (training data)

    // ── Aggressive SEO scrapers — block to save bandwidth ─────────────────────
    { userAgent: 'AhrefsBot',  disallow: ['/'] },
    { userAgent: 'SemrushBot', disallow: ['/'] },
    { userAgent: 'MJ12bot',    disallow: ['/'] },
    { userAgent: 'DotBot',     disallow: ['/'] },
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
