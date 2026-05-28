'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '../../lib/analytics-pageview';

/**
 * Mounts in providers.tsx — fires a page-view ping every time the
 * pathname changes. Powered by Next.js's usePathname hook so it works
 * for both App Router server pages and client transitions.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
