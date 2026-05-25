'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import type { ApiResponse, User } from '../types';

export function useAuth() {
  const { user, setAuth, clearAuth, isAuthenticated, hasRole } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const login = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await api.post<ApiResponse<{ accessToken: string; user: User }>>(
        '/auth/login',
        credentials,
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  /** Step-up login: verifies password + skips OTP if device is trusted. */
  const loginMfa = useMutation({
    mutationFn: async (credentials: { email: string; password: string; deviceToken?: string }) => {
      const res = await api.post<ApiResponse<
        | { trusted: true; accessToken: string; user: User }
        | { trusted: false; challenge: string; email: string; cooldownUntil: number }
      >>('/auth/login/mfa', credentials);
      return res.data.data;
    },
    onSuccess: (data) => {
      if (data.trusted) {
        setAuth(data.user, data.accessToken);
        queryClient.invalidateQueries({ queryKey: ['me'] });
      }
    },
  });

  const verifyOtp = useMutation({
    mutationFn: async (body: { challenge: string; code: string; trustDevice?: boolean }) => {
      const res = await api.post<ApiResponse<{ accessToken: string; user: User; deviceToken?: string }>>(
        '/auth/login/verify-otp',
        body,
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      // Persist the device token so the next login can skip OTP
      if (data.deviceToken) {
        try { localStorage.setItem('device_token', data.deviceToken); } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const resendOtp = useMutation({
    mutationFn: async (body: { challenge: string }) => {
      const res = await api.post<ApiResponse<{ cooldownUntil: number }>>('/auth/login/resend-otp', body);
      return res.data.data;
    },
  });

  const register = useMutation({
    mutationFn: async (body: {
      email: string;
      password: string;
      termsAccepted: boolean;
      privacyAccepted: boolean;
      marketingConsent?: boolean;
      /** Honeypot — must stay empty for real users; bots fill it and get 409. */
      website?: string;
    }) => {
      const res = await api.post<ApiResponse<User>>('/auth/register', body);
      return res.data.data;
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (body: { password: string }) => {
      await api.delete('/auth/account', { data: body });
    },
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      router.push('/');
    },
  });

  const updateMarketingConsent = useMutation({
    mutationFn: async (consent: boolean) => {
      const res = await api.patch<ApiResponse<User>>('/auth/marketing-consent', { consent });
      return res.data.data;
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      // Best-effort — ignore 401 if token already expired
      try { await api.post('/auth/logout'); } catch {}
    },
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      router.push('/auth/login');
    },
  });

  return { user, login, loginMfa, verifyOtp, resendOtp, register, logout, deleteAccount, updateMarketingConsent, isAuthenticated, hasRole };
}
