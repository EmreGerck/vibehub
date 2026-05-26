'use client';

/**
 * SearchPalette — Cmd+K instant search
 * ──────────────────────────────────────
 * Now powered by Meilisearch via GET /products/search.
 * Falls back to Prisma LIKE automatically (server-side).
 * Shows fuzzy results with typo-tolerance and Turkish normalization.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { useI18n } from '../../lib/i18n';

interface SearchResult {
  type: 'product' | 'artist';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image?: string;
  price?: number;
}

interface SearchMeta {
  processingTimeMs?: number;
  total: number;
  engine: 'meilisearch' | 'prisma';
}

export function SearchPalette() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [meta, setMeta]       = useState<SearchMeta | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();
  const t = useI18n((s) => s.t);

  // Keyboard shortcut: Cmd+K / Ctrl+K to open
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setMeta(null);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setMeta(null); return; }
    setLoading(true);
    try {
      const [searchRes, vendorsRes] = await Promise.all([
        // Use the new Meilisearch-backed endpoint
        api.get('/products/search', { params: { q, limit: 6 } }).catch(() => null),
        api.get('/vendors',         { params: { limit: 3, search: q } }).catch(() => null),
      ]);

      const items: SearchResult[] = [];

      // Vendors first (artists)
      const vendors = vendorsRes?.data?.data?.items ?? [];
      for (const v of vendors) {
        items.push({
          type:     'artist',
          id:       v.id,
          title:    v.displayName,
          subtitle: v.artistType ?? 'Artist',
          href:     `/store/${v.slug}`,
        });
      }

      // Products from Meilisearch
      const products = searchRes?.data?.data?.items ?? [];
      for (const p of products) {
        const price = p.variants?.[0]?.priceOverride ?? p.price;
        items.push({
          type:     'product',
          id:       p.id,
          title:    p.title,
          subtitle: p.tenant?.displayName ?? '',
          href:     `/product/${p.id}`,
          image:    p.images?.[0],
          price:    Number(price),
        });
      }

      setResults(items);
      setSelected(0);

      // Build meta info
      const searchData = searchRes?.data?.data;
      if (searchData) {
        setMeta({
          total:            searchData.total ?? 0,
          processingTimeMs: searchData.processingTimeMs,
          engine:           searchData.processingTimeMs !== undefined ? 'meilisearch' : 'prisma',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[selected]) {
        navigate(results[selected].href);
      } else if (query.trim()) {
        // Full search page
        navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
        setOpen(false);
      }
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('search.label')}
        className="relative w-full max-w-xl mx-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-800">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder')}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={results[selected] ? `search-result-${selected}` : undefined}
            aria-autocomplete="list"
            className="flex-1 py-4 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
          />
          {loading && (
            <svg className="animate-spin h-4 w-4 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto">
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try a different spelling or keyword</p>
            </div>
          )}

          {results.length > 0 && (
            <div id="search-results" role="listbox" className="py-2">
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}`}
                  id={`search-result-${i}`}
                  role="option"
                  aria-selected={i === selected}
                  onClick={() => navigate(r.href)}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    i === selected
                      ? 'bg-purple-50 dark:bg-purple-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-10 w-10 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                    {r.image ? (
                      <Image src={r.image} alt="" fill className="object-cover" sizes="40px" />
                    ) : r.type === 'artist' ? (
                      <span className="text-purple-500 font-bold text-lg">{r.title?.[0] ?? '?'}</span>
                    ) : (
                      <span className="text-gray-400 font-bold text-lg">{r.title?.[0] ?? '?'}</span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.subtitle}</p>
                  </div>

                  {/* Price badge (products only) */}
                  {r.type === 'product' && r.price !== undefined && (
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 shrink-0">
                      {formatPrice(r.price)}
                    </span>
                  )}

                  {/* Type badge */}
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                    r.type === 'artist'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {r.type === 'artist' ? 'Artist' : 'Product'}
                  </span>
                </button>
              ))}

              {/* Footer: see all results */}
              {meta && meta.total > 6 && (
                <button
                  onClick={() => {
                    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-3 text-sm text-center text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors border-t border-gray-100 dark:border-gray-800"
                >
                  {t('search.seeAll').replace('{n}', meta.total.toLocaleString())}
                </button>
              )}
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              <p>{t('search.typeToSearch')}</p>
              <p className="mt-1 text-xs">{t('search.hint')}</p>
            </div>
          )}
        </div>

        {/* Meta footer — engine + timing */}
        {meta && query.trim().length >= 2 && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 dark:text-gray-600">
              {meta.engine === 'meilisearch' ? (
                <>⚡ Meilisearch · {meta.processingTimeMs}ms</>
              ) : (
                <>📋 Database search</>
              )}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-600">
              {meta.total.toLocaleString()} results
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
