'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse } from '../types';
import { useAuthStore } from '../store/auth.store';

export interface AppNotification {
  id: string;
  type: 'ORDER_SHIPPED' | 'FORUM_REPLY' | 'NEW_DROP' | string;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationsPage {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
}

/** Polls every 30 seconds while the bell dropdown is closed; refresh-on-focus. */
export function useNotifications(page = 1, limit = 20) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['notifications', page, limit],
    queryFn: async () => {
      const res = await api.get<ApiResponse<NotificationsPage>>('/notifications', {
        params: { page, limit },
      });
      return res.data.data;
    },
    enabled: !!user,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

/** Lightweight count poll used by the navbar bell badge. */
export function useUnreadCount() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
      return res.data.data.count;
    },
    enabled: !!user,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
