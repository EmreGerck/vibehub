'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { Toaster } from '../components/ui/Toaster';
import { SearchPalette } from '../components/ui/SearchPalette';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { CookieBanner } from '../components/ui/CookieBanner';
import { useAuthStore } from '../store/auth.store';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    // User is persisted but token is gone (page refresh) — silently restore
    if (user && !accessToken) {
      axios
        .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
        .then((res) => {
          const token = res.data?.data?.accessToken;
          if (token) setAccessToken(token);
          else clearAuth();
        })
        .catch(() => {
          // Refresh cookie expired — session is truly over
          clearAuth();
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
        {children}
        <Toaster />
        <SearchPalette />
        <ScrollToTop />
        <CookieBanner />
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
