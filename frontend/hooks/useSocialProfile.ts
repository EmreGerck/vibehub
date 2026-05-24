'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse, UserSocialProfile, ProfileVisitor } from '../types';

export function useMySocialProfile({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['social-profile', 'me'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<UserSocialProfile>>('/user-profile/me');
      return res.data.data;
    },
    staleTime: 60 * 1000 * 5,
    enabled,
  });
}

export function useUpdateSocialProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      nickname?: string;
      bio?: string;
      interests?: string[];
      avatarUrl?: string;
      bannerUrl?: string;
      ghostMode?: boolean;
    }) => {
      const res = await api.patch<ApiResponse<UserSocialProfile>>('/user-profile/me', data);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['social-profile', 'me'], data);
    },
  });
}

export function usePublicProfile(nickname: string | undefined) {
  return useQuery({
    queryKey: ['social-profile', nickname],
    queryFn: async () => {
      const res = await api.get<ApiResponse<UserSocialProfile>>(`/user-profile/${nickname}`);
      return res.data.data;
    },
    enabled: !!nickname,
    staleTime: 60 * 1000 * 2,
  });
}

export function useMyVisitors() {
  return useQuery({
    queryKey: ['social-profile', 'visitors'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ProfileVisitor[]>>('/user-profile/me/visitors');
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });
}
