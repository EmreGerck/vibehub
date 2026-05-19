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

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const res = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newToken = res.data?.data?.accessToken;
        if (newToken) {
          const { useAuthStore } = await import('../store/auth.store');
          useAuthStore.getState().setAccessToken(newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(original);
      } catch {
        const { useAuthStore } = await import('../store/auth.store');
        const hasUser = useAuthStore.getState().user;
        if (hasUser) {
          useAuthStore.getState().clearAuth();
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  },
);
