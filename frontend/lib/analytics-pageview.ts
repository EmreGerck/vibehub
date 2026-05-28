/**
 * Lightweight client-side page-view ping.
 * Called from the global PageViewTracker in app/providers.tsx whenever
 * the route changes. Records device/browser info on the backend for the
 * admin dashboard's device breakdown widget.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let lastPath: string | null = null;

export function trackPageView(path: string): void {
  // Dedupe: don't re-track the exact same path back-to-back
  if (path === lastPath) return;
  lastPath = path;

  // Fire-and-forget; never await
  (async () => {
    try {
      await fetch(`${API_URL}/analytics/pageview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          path,
          referer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
        }),
        // Use keepalive so the request survives page navigation
        keepalive: true,
      });
    } catch {
      /* swallow — analytics must never affect UX */
    }
  })();
}
