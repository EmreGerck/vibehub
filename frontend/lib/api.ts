import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token (from in-memory Zustand store) + locale lang param
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Read token from memory — never from localStorage (XSS protection)
    const { useAuthStore } = require('../store/auth.store');
    const token: string | null = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const { useI18n } = require('../lib/i18n');
    const locale: string = useI18n.getState().locale ?? 'tr';
    config.params = { lang: locale, ...config.params };
  }
  return config;
});

// ── Token refresh with race-condition guard ───────────────────────────────────
// Without this, multiple simultaneous 401s (e.g. cart + order + validation all
// firing at once during checkout) each attempt a refresh, the 2nd attempt uses
// an already-rotated token and fails → the user gets logged out mid-checkout.
// The singleton promise ensures ONE refresh flight is in-progress at a time;
// all concurrent 401s await the same promise and reuse the result.

let _refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!_refreshPromise) {
    _refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => (res.data?.data?.accessToken as string) ?? null)
      .catch(() => null)
      .finally(() => { _refreshPromise = null; });
  }
  return _refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as any;

    // Only attempt refresh once per request, and only on 401
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    const newToken = await refreshAccessToken();

    if (newToken) {
      // Persist the new token and retry the original request
      const { useAuthStore } = await import('../store/auth.store');
      useAuthStore.getState().setAccessToken(newToken);
      original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
      return api(original);
    }

    // Refresh failed — only log out if there was an active session
    const { useAuthStore } = await import('../store/auth.store');
    if (useAuthStore.getState().user) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  },
);
