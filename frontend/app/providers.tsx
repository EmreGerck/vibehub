'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { Toaster } from '../components/ui/Toaster';
import { SearchPalette } from '../components/ui/SearchPalette';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { CookieBanner } from '../components/ui/CookieBanner';
import { HtmlLangSync } from '../components/ui/HtmlLangSync';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { PageViewTracker } from '../components/analytics/PageViewTracker';
import { useAuthStore } from '../store/auth.store';
import { refreshAccessToken } from '../lib/api';

/**
 * Runs once on mount. If the user object is hydrated from localStorage but the
 * in-memory access token is gone (e.g. page refresh), attempt a silent token
 * refresh using the httpOnly refresh cookie. This keeps the user logged in
 * without ever storing the access token in localStorage.
 */
function AuthBootstrap() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    // User is persisted but token is gone (page refresh) — silently restore.
    // Use the shared singleton from api.ts so this dedupes with any 401-retry
    // refresh that the response interceptor kicks off in parallel.
    //
    // P0 layer 4 (Sprint 14 follow-up): do NOT clearAuth() on refresh failure
    // here. AuthBootstrap races with the response interceptor on pages that
    // render auth-gated components (MobileBottomNav → useCart → 401 → retry
    // refresh). If the interceptor wins the rotation, AuthBootstrap's refresh
    // can resolve to null even though the session is fine — its old "else
    // clearAuth()" would then nuke the user. Now: only ever set the token on
    // success. Real session death is handled by the response interceptor,
    // which has the full context (was there a request, did refresh truly
    // fail, is the user still in the store) to decide whether to clearAuth.
    if (user && !accessToken) {
      refreshAccessToken().then((token) => {
        if (token) setAccessToken(token);
      });
    }
  }, [hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            // Don't retry on the public site — a single failed request shouldn't
            // add 2-4 s of delay. Auth-sensitive queries handle 401 via the
            // axios response interceptor instead.
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthBootstrap />
        <HtmlLangSync />
        <PageViewTracker />
        {children}
        <Toaster />
        <SearchPalette />
        <ScrollToTop />
        <CookieBanner />
        <MobileBottomNav />
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
