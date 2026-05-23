'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useVendors } from '../../hooks/useVendors';
import { Spinner } from '../ui/Spinner';
import type { Tenant } from '../../types';

const ARTIST_LABELS: Record<string, string> = {
  BAND: 'Band',
  COMEDIAN: 'Comedian',
  INFLUENCER: 'Influencer',
  ARTIST: 'Visual Artist',
  OTHER: 'Creator',
};

const ARTIST_COLORS: Record<string, string> = {
  BAND: 'badge-purple',
  COMEDIAN: 'badge-yellow',
  INFLUENCER: 'badge-blue',
  ARTIST: 'badge-green',
  OTHER: 'badge-gray',
};

export function VendorGrid() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, isLoading, isError } = useVendors({
    limit: 24,
    search: debouncedSearch || undefined,
  });

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    clearTimeout((window as any).__searchTimer);
    (window as any).__searchTimer = setTimeout(() => {
      setDebouncedSearch(e.target.value);
    }, 300);
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-6 max-w-sm">
        <input
          className="input"
          placeholder="Search stores…"
          value={search}
          onChange={handleSearch}
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-800 bg-red-900/20 p-6 text-center text-red-300">
          Could not load stores — make sure the API is running on port 3001.
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="py-20 text-center text-gray-500">
          No stores found.{' '}
          <Link href="/vendors/apply" className="text-brand-400 hover:underline">
            Be the first to apply!
          </Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.items.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  );
}

function VendorCard({ vendor }: { vendor: Tenant }) {
  return (
    <Link
      href={`/store/${vendor.slug}`}
      className="card group flex flex-col overflow-hidden hover:border-brand-700 transition-colors duration-200"
    >
      {/* Banner / placeholder */}
      <div className="h-24 bg-gradient-to-br from-brand-950 to-surface-muted flex items-center justify-center">
        {vendor.logoUrl ? (
          <img
            src={vendor.logoUrl}
            alt={vendor.displayName}
            className="h-16 w-16 rounded-full object-cover border-2 border-surface-border"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-surface-card border-2 border-surface-border flex items-center justify-center text-2xl font-bold text-brand-400">
            {vendor.displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
            {vendor.displayName}
          </h3>
          <span className={ARTIST_COLORS[vendor.artistType]}>
            {ARTIST_LABELS[vendor.artistType]}
          </span>
        </div>

        {vendor.bio && (
          <p className="text-xs text-gray-500 line-clamp-2">{vendor.bio}</p>
        )}

        <div className="mt-auto pt-2 text-xs text-gray-600">
          @{vendor.slug}
        </div>
      </div>
    </Link>
  );
}
