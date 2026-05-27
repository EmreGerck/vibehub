/**
 * Dynamic sitemap — Next.js 14 App Router
 * ─────────────────────────────────────────
 * Generates sitemap.xml with:
 *   • Static pages (home, shop, about, legal)
 *   • All LIVE products
 *   • All active vendor stores
 *   • Category pages
 *
 * Env: NEXT_PUBLIC_FRONTEND_URL, NEXT_PUBLIC_API_URL
 */

import type { MetadataRoute } from 'next';
import { TOPICS } from './rehber/topics';

const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://vibehub.com.tr';
const API_URL   = process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:3001';

type SitemapEntry = MetadataRoute.Sitemap[number];

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 3600 },   // revalidate every hour
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static pages ────────────────────────────────────────────────────────────
  const staticPages: SitemapEntry[] = [
    { url: SITE_URL,                          lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/shop`,               lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${SITE_URL}/vendors`,            lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${SITE_URL}/rehber`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE_URL}/support`,            lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/about`,              lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`,            lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/legal/terms`,        lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/legal/privacy`,      lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/legal/kvkk`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/legal/withdrawal`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];

  // ── Rehber editorial topic pages ─────────────────────────────────────────────
  const rehberEntries: SitemapEntry[] = Object.keys(TOPICS).map((slug) => ({
    url:             `${SITE_URL}/rehber/${slug}`,
    lastModified:    now,
    changeFrequency: 'monthly',
    priority:        0.7,
  }));

  // ── Products ─────────────────────────────────────────────────────────────────
  interface ProductItem { id: string; updatedAt?: string; createdAt?: string }
  const productData = await fetchJSON<{ items: ProductItem[]; total: number }>('/products?limit=1000&page=1');
  const productEntries: SitemapEntry[] = (productData?.items ?? []).map((p) => ({
    url:             `${SITE_URL}/product/${p.id}`,
    lastModified:    p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: 'weekly',
    priority:        0.8,
  }));

  // ── Vendor stores ─────────────────────────────────────────────────────────────
  interface VendorItem { slug: string; updatedAt?: string }
  const vendorData = await fetchJSON<{ items: VendorItem[]; total: number }>('/vendors?limit=500&page=1');
  const vendorEntries: SitemapEntry[] = (vendorData?.items ?? []).map((v) => ({
    url:             `${SITE_URL}/store/${v.slug}`,
    lastModified:    v.updatedAt ? new Date(v.updatedAt) : now,
    changeFrequency: 'weekly',
    priority:        0.7,
  }));

  // ── Categories ─────────────────────────────────────────────────────────────────
  interface CategoryItem { slug: string; updatedAt?: string }
  const categoryData = await fetchJSON<CategoryItem[]>('/categories');
  const categoryEntries: SitemapEntry[] = (categoryData ?? []).map((c) => ({
    url:             `${SITE_URL}/shop/${c.slug}`,
    lastModified:    c.updatedAt ? new Date(c.updatedAt) : now,
    changeFrequency: 'weekly',
    priority:        0.6,
  }));

  return [
    ...staticPages,
    ...rehberEntries,
    ...productEntries,
    ...vendorEntries,
    ...categoryEntries,
  ];
}
