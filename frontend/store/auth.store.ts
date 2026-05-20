import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  /** In-memory only — never written to localStorage (XSS protection) */
  accessToken: string | null;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setAuth: (user: User, token: string) => void;
  /** Update the in-memory token without changing the user (used by refresh interceptor) */
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  hasRole: (roles: User['role'][]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setAuth: (user, accessToken) => {
        // accessToken stays in memory only — NOT written to localStorage
        set({ user, accessToken });
        // Set a non-httpOnly marker cookie on the frontend domain so middleware
        // can detect logged-in state. The actual refresh_token cookie is set by
        // the backend on its own domain (cross-site, not readable by us).
        if (typeof document !== 'undefined') {
          const secure = window.location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = `vh_session=1; Path=/; Max-Age=2592000; SameSite=Lax${secure}`;
        }
      },

      setAccessToken: (token) => {
        set({ accessToken: token });
      },

      clearAuth: () => {
        set({ user: null, accessToken: null });
        if (typeof document !== 'undefined') {
          const secure = window.location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = `vh_session=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
        }
      },

      isAuthenticated: () => !!get().user,

      hasRole: (roles) => {
        const user = get().user;
        return user ? roles.includes(user.role) : false;
      },
    }),
    {
      name: 'auth',
      // Only persist the user profile — never the access token
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // If we already have a persisted user, re-set the marker cookie
        // so middleware doesn't bounce us on subsequent navigation.
        if (state?.user && typeof document !== 'undefined') {
          const secure = window.location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = `vh_session=1; Path=/; Max-Age=2592000; SameSite=Lax${secure}`;
        }
      },
    },
  ),
);
