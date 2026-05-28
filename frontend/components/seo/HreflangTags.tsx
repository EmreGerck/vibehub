/**
 * HreflangTags — hreflang language alternates builder
 * ─────────────────────────────────────────────────────
 * Returns the `alternates` object expected by Next 14 Metadata API.
 * Drop the result into `generateMetadata` (or static `metadata`) for any page
 * that wants to advertise its TR + EN equivalents to Google.
 *
 * TODO (URL split): The site currently does runtime i18n via lib/i18n.ts —
 * there are no /en/* routes yet. Until those exist we ship the EN variant
 * as `?lang=en` (Option A from the SEO operationalization brief). This is
 * a weaker signal than dedicated locale routes but at least gives Google
 * something to crawl/cluster instead of guessing. When /en/* routes land,
 * swap the EN URL builder below to use the proper localized path.
 *
 * Usage:
 *   export async function generateMetadata(): Promise<Metadata> {
 *     return { ...buildHreflangAlternates('/shop') };
 *   }
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  'https://vibehub.com.tr';

/**
 * Build the `alternates` field for Next.js Metadata.
 *
 * @param path - Path relative to site root, must start with "/". Example: "/shop"
 * @returns `{ alternates: { canonical, languages } }` ready to spread into Metadata.
 */
export function buildHreflangAlternates(path: string) {
  // Defensive: ensure leading slash + strip trailing slash (except root)
  const normalized =
    path === '/' ? '/' : (path.startsWith('/') ? path : `/${path}`).replace(/\/$/, '');

  const trUrl = `${SITE_URL}${normalized === '/' ? '' : normalized}` || SITE_URL;
  // EN currently rides on query-string; ?lang=en is hydrated by lib/i18n.ts.
  // When /en/* routes exist, change to: `${SITE_URL}/en${normalized}`
  const enUrl = `${trUrl}${trUrl.includes('?') ? '&' : '?'}lang=en`;

  return {
    alternates: {
      canonical: trUrl,
      languages: {
        tr: trUrl,
        'tr-TR': trUrl,
        en: enUrl,
        'x-default': trUrl,
      },
    },
  } as const;
}
