'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse, Conversation, DirectMessage } from '../types';

export function useConversations() {
  return useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Conversation[]>>('/messages');
      return res.data.data;
    },
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000, // poll every 15s for new messages
  });
}

interface ThreadResponse {
  messages: DirectMessage[];
  partner: { id: string; nickname: string | null; avatarUrl: string | null };
}

export function useThread(userId: string | undefined) {
  return useQuery({
    queryKey: ['messages', 'thread', userId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ThreadResponse>>(`/messages/${userId}`);
      return res.data.data;
    },
    enabled: !!userId,
    staleTime: 5 * 1000,
    refetchInterval: 5 * 1000, // poll every 5s when viewing a thread
  });
}

export function useSendMessage(recipientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post<ApiResponse<DirectMessage>>(`/messages/${recipientId}`, { body });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'thread', recipientId] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
    },
  });
}
