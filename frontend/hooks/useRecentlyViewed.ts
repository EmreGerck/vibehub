'use client';

import { useEffect, useState, useCallback } from 'react';

interface RecentProduct {
  id: string;
  title: string;
  price: number;
  image?: string;
  tenantSlug?: string;
  viewedAt: number;
}

const STORAGE_KEY = 'vibehub-recently-viewed';
const MAX_ITEMS = 20;

function loadItems(): RecentProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems(items: RecentProduct[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    setItems(loadItems());
  }, []);

  return items;
}

export function useTrackView(product: { id: string; title: string; price: number | string; images?: string[]; tenant?: { slug: string } } | null | undefined) {
  useEffect(() => {
    if (!product) return;
    const current = loadItems();
    const filtered = current.filter((p) => p.id !== product.id);
    const entry: RecentProduct = {
      id: product.id,
      title: product.title,
      price: Number(product.price),
      image: product.images?.[0],
      tenantSlug: product.tenant?.slug,
      viewedAt: Date.now(),
    };
    const updated = [entry, ...filtered].slice(0, MAX_ITEMS);
    saveItems(updated);
  }, [product?.id]);
}
