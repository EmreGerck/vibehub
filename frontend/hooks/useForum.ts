import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse, ForumSettings, ForumTopic, ForumReply, ForumChannel } from '../types';

interface TopicsQuery {
  page?: number;
  limit?: number;
  channelId?: string;
  channelSlug?: string;
  sort?: 'latest' | 'popular' | 'artist_replied';
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function useForumSettings(tenantId?: string) {
  return useQuery({
    queryKey: ['forum-settings', tenantId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ForumSettings>>('/forum/settings');
      return res.data.data;
    },
    enabled: !!tenantId,
  });
}

export function useUpdateForumSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Pick<ForumSettings, 'enabled' | 'requireApproval' | 'allowGuestView'>>) => {
      const res = await api.patch<ApiResponse<ForumSettings>>('/forum/settings', body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum-settings'] }),
  });
}

// ── Channels ──────────────────────────────────────────────────────────────────

export function useForumChannels(tenantId?: string) {
  return useQuery({
    queryKey: ['forum-channels', tenantId],
    queryFn: async () => {
      const res = await api.get(`/forum/${tenantId}/channels`);
      return res.data.data as (ForumChannel & { _count: { topics: number } })[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; slug: string; emoji?: string; description?: string; sortOrder?: number }) => {
      const res = await api.post('/forum/channels', body);
      return res.data.data as ForumChannel;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum-channels'] }),
  });
}

export function useUpdateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, ...body }: { channelId: string; name?: string; emoji?: string; description?: string; sortOrder?: number }) => {
      const res = await api.patch(`/forum/channels/${channelId}`, body);
      return res.data.data as ForumChannel;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum-channels'] }),
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      await api.delete(`/forum/channels/${channelId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum-channels'] });
      qc.invalidateQueries({ queryKey: ['forum-topics'] });
    },
  });
}

// ── Topics ─────────────────────────────────────────────────────────────────────

export function useForumTopics(tenantId?: string, params?: TopicsQuery) {
  return useQuery({
    queryKey: ['forum-topics', tenantId, params],
    queryFn: async () => {
      const res = await api.get(`/forum/${tenantId}/topics`, { params });
      return res.data.data as { items: ForumTopic[]; total: number; page: number; limit: number };
    },
    enabled: !!tenantId,
  });
}

export function useForumTopic(topicId?: string, params?: TopicsQuery) {
  return useQuery({
    queryKey: ['forum-topic', topicId, params],
    queryFn: async () => {
      const res = await api.get(`/forum/topics/${topicId}`, { params });
      return res.data.data as ForumTopic & {
        replies: { items: ForumReply[]; total: number; page: number; limit: number };
      };
    },
    enabled: !!topicId,
  });
}

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      tenantId: string;
      title: string;
      body: string;
      channelId?: string;
      imageUrl?: string;
    }) => {
      const { tenantId, ...rest } = body;
      const res = await api.post<ApiResponse<ForumTopic>>(`/forum/${tenantId}/topics`, rest);
      return res.data.data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['forum-topics', v.tenantId] }),
  });
}

export function useCreateReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      topicId: string;
      body: string;
      parentReplyId?: string;
      imageUrl?: string;
    }) => {
      const { topicId, ...rest } = body;
      const res = await api.post<ApiResponse<ForumReply>>(`/forum/topics/${topicId}/replies`, rest);
      return res.data.data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['forum-topic', v.topicId] }),
  });
}

// ── Reactions ─────────────────────────────────────────────────────────────────

export function useToggleTopicReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ topicId, emoji }: { topicId: string; emoji: string }) => {
      const res = await api.post(`/forum/topics/${topicId}/reactions`, { emoji });
      return res.data.data as { toggled: boolean; emoji: string };
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['forum-topics'] });
      qc.invalidateQueries({ queryKey: ['forum-topic'] });
    },
  });
}

export function useToggleReplyReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ replyId, emoji }: { replyId: string; emoji: string }) => {
      const res = await api.post(`/forum/replies/${replyId}/reactions`, { emoji });
      return res.data.data as { toggled: boolean; emoji: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum-topic'] }),
  });
}

// ── Moderation ────────────────────────────────────────────────────────────────

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topicId: string) => {
      const res = await api.patch(`/forum/topics/${topicId}/pin`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum-topics'] }),
  });
}

export function useToggleLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topicId: string) => {
      const res = await api.patch(`/forum/topics/${topicId}/lock`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum-topics'] }),
  });
}

export function useMarkArtistAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (replyId: string) => {
      const res = await api.patch(`/forum/replies/${replyId}/mark-answer`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum-topic'] }),
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topicId: string) => {
      await api.delete(`/forum/topics/${topicId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum-topics'] });
      qc.invalidateQueries({ queryKey: ['forum-topic'] });
    },
  });
}

export function useDeleteReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (replyId: string) => {
      await api.delete(`/forum/replies/${replyId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum-topic'] }),
  });
}

// ── Admin variants ────────────────────────────────────────────────────────────

export function useAdminForumSettings(tenantId?: string) {
  return useQuery({
    queryKey: ['admin-forum-settings', tenantId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ForumSettings>>(`/admin/forum/settings/${tenantId}`);
      return res.data.data;
    },
    enabled: !!tenantId,
  });
}

export function useAdminUpdateForumSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, ...body }: { tenantId: string } & Partial<ForumSettings>) => {
      const res = await api.patch<ApiResponse<ForumSettings>>(`/admin/forum/settings/${tenantId}`, body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-forum-settings'] }),
  });
}
