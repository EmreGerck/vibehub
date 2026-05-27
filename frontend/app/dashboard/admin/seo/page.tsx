'use client';

import { useState, useEffect } from 'react';
import { usePlatformSettings, useUpdatePlatformSettings } from '../../../../hooks/useAdmin';
import { toast } from '../../../../store/toast.store';

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 space-y-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {hint && <span className="ml-2 text-[10px] text-gray-400">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

// ── Preview card ──────────────────────────────────────────────────────────────
function GooglePreview({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 max-w-lg">
      <p className="text-[10px] text-gray-400 mb-1">Google Search Preview</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">https://vibehub.com.tr</p>
      <p className="text-base text-blue-600 dark:text-blue-400 font-medium leading-snug mt-0.5 line-clamp-1">{title || 'VibeHub — Your Merch, Your Stage'}</p>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{description || 'Buy official merch from your favourite artists and creators.'}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminSeoPage() {
  const { data: settings, isLoading } = usePlatformSettings();
  const update = useUpdatePlatformSettings();

  // Meta
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');

  // Social & Analytics
  const [twitterHandle, setTwitterHandle] = useState('');
  const [facebookPixelId, setFacebookPixelId] = useState('');
  const [googleTagManagerId, setGoogleTagManagerId] = useState('');

  // Schema
  const [schemaOrgJson, setSchemaOrgJson] = useState('');
  const [schemaError, setSchemaError] = useState('');

  // Robots
  const [robotsTxt, setRobotsTxt] = useState('');

  // Active tab
  const [tab, setTab] = useState<'meta' | 'social' | 'schema' | 'robots' | 'sitemap'>('meta');

  useEffect(() => {
    if (!settings) return;
    setMetaTitle(settings.metaTitle ?? '');
    setMetaDescription(settings.metaDescription ?? '');
    setOgImageUrl(settings.ogImageUrl ?? '');
    setTwitterHandle(settings.twitterHandle ?? '');
    setFacebookPixelId(settings.facebookPixelId ?? '');
    setGoogleTagManagerId(settings.googleTagManagerId ?? '');
    setSchemaOrgJson(settings.schemaOrgJson ?? '');
    setRobotsTxt(settings.robotsTxt ?? 'User-agent: *\nAllow: /\n\nSitemap: https://vibehub.com.tr/sitemap.xml');
  }, [settings]);

  function validateSchema(json: string): boolean {
    if (!json.trim()) { setSchemaError(''); return true; }
    try { JSON.parse(json); setSchemaError(''); return true; }
    catch { setSchemaError('Invalid JSON — fix the syntax before saving.'); return false; }
  }

  async function saveMeta() {
    try {
      await update.mutateAsync({ metaTitle, metaDescription, ogImageUrl });
      toast('success', 'Meta tags saved');
    } catch { toast('error', 'Save failed'); }
  }

  async function saveSocial() {
    try {
      await update.mutateAsync({ twitterHandle, facebookPixelId, googleTagManagerId });
      toast('success', 'Social & analytics saved');
    } catch { toast('error', 'Save failed'); }
  }

  async function saveSchema() {
    if (!validateSchema(schemaOrgJson)) return;
    try {
      await update.mutateAsync({ schemaOrgJson: schemaOrgJson.trim() || null });
      toast('success', 'Schema saved');
    } catch { toast('error', 'Save failed'); }
  }

  async function saveRobots() {
    try {
      await update.mutateAsync({ robotsTxt });
      toast('success', 'robots.txt saved');
    } catch { toast('error', 'Save failed'); }
  }

  const TABS = [
    { key: 'meta', label: 'Meta Tags', icon: '🏷️' },
    { key: 'social', label: 'Social & Analytics', icon: '📊' },
    { key: 'schema', label: 'Schema / JSON-LD', icon: '🔗' },
    { key: 'robots', label: 'robots.txt', icon: '🤖' },
    { key: 'sitemap', label: 'Sitemap', icon: '🗺️' },
  ] as const;

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SEO Engine</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Control how VibeHub appears in search engines, social shares, and link previews.
        </p>
      </div>

      {/* Quick-win tips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {[
          { icon: '📝', title: 'Meta Title', tip: 'Keep under 60 chars. Put the brand name at the end.', ok: metaTitle.length > 0 && metaTitle.length <= 60 },
          { icon: '📄', title: 'Meta Description', tip: 'Aim for 120–155 chars. Add a call to action.', ok: metaDescription.length >= 120 && metaDescription.length <= 155 },
          { icon: '🖼️', title: 'OG Image', tip: '1200×630 px recommended for social cards.', ok: !!ogImageUrl },
        ].map(({ icon, title, tip, ok }) => (
          <div key={title} className={`rounded-xl border p-3 ${ok ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20' : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'}`}>
            <p className={`font-semibold flex items-center gap-1.5 ${ok ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
              <span>{ok ? '✅' : '⚠️'}</span> {icon} {title}
            </p>
            <p className={`mt-1 ${ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>{tip}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${
              tab === key
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── Meta Tags ── */}
      {tab === 'meta' && (
        <div className="space-y-5">
          <Section title="Page Title & Description" icon="🏷️">
            <Field label="Site Title" hint={`${metaTitle.length}/60 chars`}>
              <input
                className={`input w-full ${metaTitle.length > 60 ? 'border-red-400' : ''}`}
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="VibeHub — Your Merch, Your Stage"
              />
            </Field>
            <Field label="Meta Description" hint={`${metaDescription.length}/155 chars — shown under the title in Google`}>
              <textarea
                className={`input w-full resize-none ${metaDescription.length > 155 ? 'border-red-400' : ''}`}
                rows={3}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Buy official merch from your favourite artists and creators."
              />
            </Field>
            <GooglePreview title={metaTitle} description={metaDescription} />
          </Section>

          <Section title="Open Graph / Social Card" icon="🖼️">
            <Field label="OG Image URL" hint="1200×630 px · shown when sharing on Twitter, WhatsApp, iMessage…">
              <input
                className="input w-full"
                value={ogImageUrl}
                onChange={(e) => setOgImageUrl(e.target.value)}
                placeholder="https://vibehub.com.tr/og-default.png"
              />
            </Field>
            {ogImageUrl && (
              <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-w-sm">
                <img src={ogImageUrl} alt="OG Preview" className="w-full object-cover aspect-[1200/630]" />
                <div className="p-3 bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{metaTitle || 'VibeHub'}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">{metaDescription}</p>
                  <p className="text-[10px] text-gray-400 mt-1">vibehub.com.tr</p>
                </div>
              </div>
            )}
            <button
              onClick={saveMeta}
              disabled={update.isPending}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
            >
              {update.isPending ? 'Saving…' : 'Save Meta Tags'}
            </button>
          </Section>
        </div>
      )}

      {/* ── Social & Analytics ── */}
      {tab === 'social' && (
        <Section title="Social & Analytics" icon="📊">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Twitter / X Handle" hint="Without @">
              <input
                className="input w-full"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value.replace('@', ''))}
                placeholder="vibehub"
              />
            </Field>
            <Field label="Facebook Pixel ID">
              <input
                className="input w-full font-mono text-sm"
                value={facebookPixelId}
                onChange={(e) => setFacebookPixelId(e.target.value)}
                placeholder="1234567890123456"
              />
            </Field>
            <Field label="Google Tag Manager ID">
              <input
                className="input w-full font-mono text-sm"
                value={googleTagManagerId}
                onChange={(e) => setGoogleTagManagerId(e.target.value)}
                placeholder="GTM-XXXXXXX"
              />
            </Field>
          </div>

          {/* Explainer */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-xs space-y-2 text-blue-800 dark:text-blue-300">
            <p className="font-semibold">💡 How these work</p>
            <p><b>GTM</b> — add one ID, then configure Google Analytics, Hotjar, Ads, etc. inside GTM without touching code.</p>
            <p><b>Facebook Pixel</b> — tracks purchases, add-to-carts, and page views for ad retargeting.</p>
            <p><b>Twitter Handle</b> — shows your @handle on Twitter card previews when someone shares a product.</p>
          </div>

          <button
            onClick={saveSocial}
            disabled={update.isPending}
            className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
          >
            {update.isPending ? 'Saving…' : 'Save Social & Analytics'}
          </button>
        </Section>
      )}

      {/* ── Schema / JSON-LD ── */}
      {tab === 'schema' && (
        <Section title="Schema.org / JSON-LD" icon="🔗">
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-xs space-y-2 text-blue-800 dark:text-blue-300">
            <p className="font-semibold">💡 What is Schema / JSON-LD?</p>
            <p>It's structured data that Google reads to understand your site — enabling <b>rich results</b> (star ratings, product prices, breadcrumbs) directly in search results. The default Organization schema is auto-generated. Use this field to override it with custom data.</p>
            <p>Leave blank to use the auto-generated default. <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener" className="underline">Test your schema here →</a></p>
          </div>

          <Field label="Organization JSON-LD (optional override)">
            <textarea
              className={`input w-full font-mono text-xs resize-y min-h-[200px] ${schemaError ? 'border-red-400' : ''}`}
              value={schemaOrgJson}
              onChange={(e) => { setSchemaOrgJson(e.target.value); validateSchema(e.target.value); }}
              placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "VibeHub",\n  "url": "https://vibehub.com.tr",\n  "logo": "https://vibehub.com.tr/logo.png",\n  "sameAs": [\n    "https://twitter.com/vibehub",\n    "https://instagram.com/vibehub"\n  ]\n}`}
              spellCheck={false}
            />
            {schemaError && <p className="text-xs text-red-500 mt-1">{schemaError}</p>}
          </Field>

          <button
            onClick={saveSchema}
            disabled={update.isPending || !!schemaError}
            className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
          >
            {update.isPending ? 'Saving…' : 'Save Schema'}
          </button>
        </Section>
      )}

      {/* ── Robots.txt ── */}
      {tab === 'robots' && (
        <Section title="robots.txt" icon="🤖">
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-xs space-y-2 text-blue-800 dark:text-blue-300">
            <p className="font-semibold">💡 What is robots.txt?</p>
            <p>A text file that tells search engine crawlers which pages they're allowed to index. <b>User-agent: * / Allow: /</b> means "all bots, crawl everything" — the safe default.</p>
            <p>Add <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">Disallow: /dashboard/</code> to hide admin pages from Google.</p>
          </div>

          <Field label="robots.txt content">
            <textarea
              className="input w-full font-mono text-xs resize-y min-h-[180px]"
              value={robotsTxt}
              onChange={(e) => setRobotsTxt(e.target.value)}
              spellCheck={false}
            />
          </Field>

          <div className="flex items-center gap-3">
            <button
              onClick={saveRobots}
              disabled={update.isPending}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
            >
              {update.isPending ? 'Saving…' : 'Save robots.txt'}
            </button>
            <a
              href="/robots.txt"
              target="_blank"
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
            >
              Preview live →
            </a>
          </div>
        </Section>
      )}

      {/* ── Sitemap ── */}
      {tab === 'sitemap' && (
        <Section title="Sitemap" icon="🗺️">
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-xs space-y-2 text-blue-800 dark:text-blue-300">
            <p className="font-semibold">💡 What is a sitemap?</p>
            <p>A sitemap.xml file tells Google about every page on your site, helping it discover and index new products quickly. VibeHub auto-generates a sitemap from all live products and vendor stores.</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Auto-generated Sitemap</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Updated on every deployment — includes all LIVE products and vendor stores</p>
              </div>
              <a
                href="/sitemap.xml"
                target="_blank"
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline whitespace-nowrap"
              >
                View →
              </a>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Submit to Google Search Console</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tell Google to crawl your sitemap immediately</p>
              </div>
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs btn-ghost px-3 py-1.5"
              >
                Open →
              </a>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Test Rich Results</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Verify that Google can read your product schema</p>
              </div>
              <a
                href="https://search.google.com/test/rich-results"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs btn-ghost px-3 py-1.5"
              >
                Test →
              </a>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 space-y-1.5">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">📋 SEO Quick Checklist</p>
              {[
                ['Meta title set (under 60 chars)', metaTitle.length > 0 && metaTitle.length <= 60],
                ['Meta description set (120–155 chars)', metaDescription.length >= 120 && metaDescription.length <= 155],
                ['OG image uploaded (1200×630)', !!ogImageUrl],
                ['robots.txt allows crawling', robotsTxt.includes('Allow: /')],
                ['Google Tag Manager configured', !!googleTagManagerId],
              ].map(([label, ok]) => (
                <div key={label as string} className="flex items-center gap-2 text-xs">
                  <span>{ok ? '✅' : '⬜'}</span>
                  <span className={ok ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500'}>{label as string}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
