'use client';
import { useState } from 'react';

export function usePageSize(key: string, defaultSize = 10): [number, (n: number) => void] {
  const storageKey = `pageSize_${key}`;
  const [size, setSize] = useState<number>(() => {
    if (typeof window === 'undefined') return defaultSize;
    const stored = localStorage.getItem(storageKey);
    return stored ? parseInt(stored, 10) : defaultSize;
  });

  function updateSize(n: number) {
    setSize(n);
    try { localStorage.setItem(storageKey, String(n)); } catch {}
  }

  return [size, updateSize];
}
