'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

interface SearchResult {
  type: 'product' | 'artist';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image?: string;
}

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const [productsRes, vendorsRes] = await Promise.all([
        api.get('/products', { params: { limit: 6, search: q } }).catch(() => null),
        api.get('/vendors', { params: { limit: 4, search: q } }).catch(() => null),
      ]);

      const items: SearchResult[] = [];

      const vendors = vendorsRes?.data?.data?.items ?? [];
      for (const v of vendors) {
        items.push({
          type: 'artist',
          id: v.id,
          title: v.displayName,
          subtitle: v.artistType ?? 'Artist',
          href: `/store/${v.slug}`,
        });
      }

      const products = productsRes?.data?.data?.items ?? [];
      for (const p of products) {
        const price = p.variants?.[0]?.priceOverride ?? p.price;
        items.push({
          type: 'product',
          id: p.id,
          title: p.title,
          subtitle: `${p.tenant?.displayName ?? ''} · ₺${Number(price).toFixed(2)}`,
          href: `/product/${p.id}`,
          image: p.images?.[0],
        });
      }

      setResults(items);
      setSelected(0);
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
    } else if (e.key === 'Enter' && results[selected]) {
      navigate(results[selected].href);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Palette */}
      <div role="dialog" aria-modal="true" aria-label="Search" className="relative w-full max-w-lg mx-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-800">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search products, artists..."
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={results[selected] ? `search-result-${selected}` : undefined}
            aria-autocomplete="list"
            className="flex-1 py-4 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && query.length >= 2 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Searching...</div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No results found</div>
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
                  {/* Icon/image */}
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                    {r.image ? (
                      <img src={r.image} alt="" className="w-full h-full object-cover" />
                    ) : r.type === 'artist' ? (
                      <span className="text-purple-500 font-bold text-lg">{r.title[0]}</span>
                    ) : (
                      <span className="text-gray-400 font-bold">{r.title[0]}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.subtitle}</p>
                  </div>

                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    r.type === 'artist'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {r.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {query.length < 2 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              Type at least 2 characters to search
            </div>
          )}
        </div>
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
