'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  useForumChannels,
  useForumTopics,
  useForumTopic,
  useCreateTopic,
  useCreateReply,
  useToggleTopicReaction,
  useToggleReplyReaction,
  useDeleteTopic,
  useDeleteReply,
} from '../../hooks/useForum';
import { useAuth } from '../../hooks/useAuth';
import { REACTION_EMOJIS, type ForumTopic, type ForumReply } from '../../types';

interface Props {
  tenantId: string;
  vendorName: string;
  vendorSlug: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: tr });
}

function Avatar({ name, url, size = 32 }: { name?: string | null; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt={name ?? ''} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  const letter = (name ?? '?')[0].toUpperCase();
  return (
    <div className="rounded-full flex items-center justify-center text-white text-sm font-bold bg-violet-500 shrink-0" style={{ width: size, height: size }}>
      {letter}
    </div>
  );
}

// ── Reaction Bar ──────────────────────────────────────────────────────────────

function ReactionBar({
  counts,
  myReactions,
  onToggle,
  compact = false,
}: {
  counts?: Record<string, number>;
  myReactions?: string[];
  onToggle?: (emoji: string) => void;
  compact?: boolean;
}) {
  const [show, setShow] = useState(false);
  const active = REACTION_EMOJIS.filter((r) => (counts?.[r.emoji] ?? 0) > 0);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {active.map(({ emoji, icon }) => {
        const count = counts?.[emoji] ?? 0;
        const isMe = myReactions?.includes(emoji);
        return (
          <button
            key={emoji}
            onClick={() => onToggle?.(emoji)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all
              ${isMe
                ? 'bg-violet-100 border-violet-400 text-violet-700 dark:bg-violet-900/30 dark:border-violet-500 dark:text-violet-300'
                : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <span>{icon}</span>
            <span>{count}</span>
          </button>
        );
      })}

      {onToggle && (
        <div className="relative">
          <button
            onClick={() => setShow((s) => !s)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed border-gray-300 text-gray-400 hover:border-violet-400 hover:text-violet-500 dark:border-gray-600 dark:text-gray-500 transition-all"
          >
            + {compact ? '' : 'Tepki'}
          </button>
          {show && (
            <div className="absolute bottom-8 left-0 z-50 flex gap-1 p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
              {REACTION_EMOJIS.map(({ emoji, icon, label }) => (
                <button
                  key={emoji}
                  onClick={() => { onToggle(emoji); setShow(false); }}
                  title={label}
                  className={`text-xl p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-125
                    ${myReactions?.includes(emoji) ? 'bg-violet-100 dark:bg-violet-900/30' : ''}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Topic Card ────────────────────────────────────────────────────────────────

function TopicCard({
  topic,
  onClick,
  currentUserId,
  onReact,
}: {
  topic: ForumTopic;
  onClick: () => void;
  currentUserId?: string;
  onReact: (topicId: string, emoji: string) => void;
}) {
  return (
    <div
      className={`group bg-white dark:bg-gray-800 rounded-2xl border transition-all hover:shadow-md overflow-hidden
        ${topic.pinned ? 'border-violet-300 dark:border-violet-700 ring-1 ring-violet-200 dark:ring-violet-800' : 'border-gray-200 dark:border-gray-700'}
        ${topic.isVendorPost ? 'border-l-4 border-l-violet-500' : ''}`}
    >
      {topic.imageUrl && (
        <img src={topic.imageUrl} alt="" className="w-full h-36 object-cover cursor-pointer" onClick={onClick} />
      )}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {topic.pinned && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">📌 Sabit</span>}
          {topic.isVendorPost && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">🎤 Artist</span>}
          {topic.hasArtistReply && !topic.isVendorPost && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">✅ Artist cevapladı</span>}
          {topic.locked && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">🔒 Kilitli</span>}
        </div>

        <h3
          onClick={onClick}
          className="font-semibold text-gray-900 dark:text-white text-sm leading-snug mb-1 cursor-pointer group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2"
        >
          {topic.title}
        </h3>
        <p onClick={onClick} className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 cursor-pointer">{topic.body}</p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={topic.author?.name} url={topic.author?.avatarUrl} size={22} />
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {topic.author?.name ?? topic.author?.email?.split('@')[0] ?? 'Anonim'} · {timeAgo(topic.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
            <span>💬 {topic._count?.replies ?? 0}</span>
            <span>👁 {topic.viewCount}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <ReactionBar
            counts={topic.reactionCounts}
            myReactions={topic.myReactions}
            onToggle={currentUserId ? (emoji) => onReact(topic.id, emoji) : undefined}
            compact
          />
        </div>
      </div>
    </div>
  );
}

// ── Reply Card ────────────────────────────────────────────────────────────────

function ReplyCard({
  reply,
  tenantId,
  currentUserId,
  isVendorView = false,
  onReact,
  onDelete,
  onMarkAnswer,
}: {
  reply: ForumReply;
  tenantId: string;
  currentUserId?: string;
  isVendorView?: boolean;
  onReact: (replyId: string, emoji: string) => void;
  onDelete: (replyId: string) => void;
  onMarkAnswer?: (replyId: string) => void;
}) {
  return (
    <div>
      {reply.isArtistAnswer && (
        <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400">✅ Artist Cevabı</div>
      )}
      <div className={`flex gap-3 p-4 rounded-2xl border transition-all
        ${reply.isArtistAnswer
          ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/10'
          : reply.isVendorPost
            ? 'border-l-4 border-l-violet-400 border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
            : 'border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800'}`}
      >
        <Avatar name={reply.author?.name} url={reply.author?.avatarUrl} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {reply.author?.name ?? reply.author?.email?.split('@')[0] ?? 'Anonim'}
            </span>
            {reply.isVendorPost && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">🎤 Artist</span>
            )}
            <span className="text-xs text-gray-400 ml-auto">{timeAgo(reply.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{reply.body}</p>
          {reply.imageUrl && <img src={reply.imageUrl} alt="" className="mt-3 rounded-xl max-h-64 object-cover" />}

          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            <ReactionBar
              counts={reply.reactionCounts}
              myReactions={reply.myReactions}
              onToggle={currentUserId ? (emoji) => onReact(reply.id, emoji) : undefined}
              compact
            />
            <div className="flex items-center gap-2 text-xs">
              {isVendorView && onMarkAnswer && (
                <button
                  onClick={() => onMarkAnswer(reply.id)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-colors
                    ${reply.isArtistAnswer ? 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30' : 'text-gray-500 hover:text-violet-600 dark:text-gray-400'}`}
                >
                  {reply.isArtistAnswer ? '✅ Cevap' : '☑️ Cevap olarak işaretle'}
                </button>
              )}
              {(currentUserId === reply.authorId || isVendorView) && (
                <button onClick={() => onDelete(reply.id)} className="text-gray-400 hover:text-red-500 transition-colors">Sil</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {reply.childReplies && reply.childReplies.length > 0 && (
        <div className="ml-10 mt-2 space-y-2">
          {reply.childReplies.map((child) => (
            <ReplyCard key={child.id} reply={child} tenantId={tenantId} currentUserId={currentUserId} isVendorView={isVendorView} onReact={onReact} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Thread View ───────────────────────────────────────────────────────────────

function ThreadView({
  topicId,
  tenantId,
  currentUserId,
  isVendorView,
  onBack,
}: {
  topicId: string;
  tenantId: string;
  currentUserId?: string;
  isVendorView?: boolean;
  onBack: () => void;
}) {
  const { data: topic, isLoading } = useForumTopic(topicId);
  const createReply = useCreateReply();
  const toggleReplyReaction = useToggleReplyReaction();
  const toggleTopicReaction = useToggleTopicReaction();
  const deleteReply = useDeleteReply();
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const handleReply = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      await createReply.mutateAsync({ topicId, body: body.trim() });
      setBody('');
    } finally {
      setPosting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>;
  if (!topic) return <div className="text-center py-12 text-gray-500">Konu bulunamadı</div>;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 mb-5 transition-colors">
        ← Geri dön
      </button>

      <div className={`p-5 rounded-2xl border mb-4 bg-white dark:bg-gray-800
        ${topic.isVendorPost ? 'border-l-4 border-l-violet-500 border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700'}`}>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {topic.channel && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{topic.channel.emoji} {topic.channel.name}</span>}
          {topic.pinned && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">📌 Sabit</span>}
          {topic.isVendorPost && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">🎤 Artist</span>}
          {topic.locked && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700">🔒 Kilitli</span>}
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{topic.title}</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 flex-wrap">
          <Avatar name={topic.author?.name} url={topic.author?.avatarUrl} size={20} />
          <span>{topic.author?.name ?? topic.author?.email?.split('@')[0] ?? 'Anonim'}</span>
          <span>·</span><span>{timeAgo(topic.createdAt)}</span>
          <span>·</span><span>👁 {topic.viewCount} görüntülenme</span>
        </div>
        {topic.imageUrl && <img src={topic.imageUrl} alt="" className="w-full rounded-xl mb-4 max-h-96 object-cover" />}
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-[15px]">{topic.body}</p>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <ReactionBar
            counts={topic.reactionCounts}
            myReactions={topic.myReactions}
            onToggle={currentUserId ? (emoji) => toggleTopicReaction.mutate({ topicId: topic.id, emoji }) : undefined}
          />
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">{topic.replies?.total ?? 0} yanıt</div>
        {topic.replies?.items.map((reply) => (
          <ReplyCard
            key={reply.id}
            reply={reply}
            tenantId={tenantId}
            currentUserId={currentUserId}
            isVendorView={isVendorView}
            onReact={(replyId, emoji) => toggleReplyReaction.mutate({ replyId, emoji })}
            onDelete={(replyId) => deleteReply.mutate(replyId)}
          />
        ))}
      </div>

      {!topic.locked && currentUserId ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Yanıtını yaz..."
            rows={3}
            className="w-full resize-none bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleReply}
              disabled={!body.trim() || posting}
              className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {posting ? 'Gönderiliyor...' : 'Yanıtla'}
            </button>
          </div>
        </div>
      ) : topic.locked ? (
        <div className="text-center py-4 text-sm text-gray-400">🔒 Bu konu kilitlenmiştir</div>
      ) : (
        <div className="text-center py-4 text-sm text-gray-400">Yanıtlamak için giriş yapın</div>
      )}
    </div>
  );
}

// ── New Topic Form ────────────────────────────────────────────────────────────

function NewTopicForm({ tenantId, channels, defaultChannelId, onClose }: {
  tenantId: string; channels: any[]; defaultChannelId?: string; onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channelId, setChannelId] = useState(defaultChannelId ?? '');
  const createTopic = useCreateTopic();

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    await createTopic.mutateAsync({ tenantId, title: title.trim(), body: body.trim(), channelId: channelId || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Yeni Konu</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
        </div>
        {channels.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kanal</label>
            <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm p-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Kanal seç (opsiyonel)</option>
              {channels.map((ch: any) => <option key={ch.id} value={ch.id}>{ch.emoji} {ch.name}</option>)}
            </select>
          </div>
        )}
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Konu başlığı..." maxLength={200} className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm p-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-3" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ne düşünüyorsun?" rows={5} maxLength={5000} className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm p-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-1" />
        <div className="text-right text-xs text-gray-400 mb-4">{body.length}/5000</div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">İptal</button>
          <button onClick={handleSubmit} disabled={!title.trim() || !body.trim() || createTopic.isPending} className="px-5 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {createTopic.isPending ? 'Gönderiliyor...' : 'Paylaş'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function StoreForum({ tenantId, vendorName, vendorSlug }: Props) {
  const { user } = useAuth();

  // Pure local state — no router dependency, always interactive
  const [activeChannel, setActiveChannel] = useState('');
  const [activeTopicId, setActiveTopicId] = useState('');
  const [sort, setSort] = useState<'latest' | 'popular' | 'artist_replied'>('latest');
  const [showNewTopic, setShowNewTopic] = useState(false);

  const { data: channels = [] } = useForumChannels(tenantId);
  const { data: topics, isLoading } = useForumTopics(tenantId, {
    channelSlug: activeChannel || undefined,
    sort,
    limit: 30,
  });
  const toggleTopicReaction = useToggleTopicReaction();

  const activeChannelObj = channels.find((c: any) => c.slug === activeChannel);

  if (activeTopicId) {
    return (
      <div>
        <ThreadView
          topicId={activeTopicId}
          tenantId={tenantId}
          currentUserId={user?.id}
          onBack={() => setActiveTopicId('')}
        />
        {showNewTopic && (
          <NewTopicForm tenantId={tenantId} channels={channels} defaultChannelId={activeChannelObj?.id} onClose={() => setShowNewTopic(false)} />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Channel rail */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        <button
          onClick={() => setActiveChannel('')}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all
            ${!activeChannel
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
        >
          💬 Tümü
        </button>
        {channels.map((ch: any) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch.slug)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all
              ${activeChannel === ch.slug
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
          >
            {ch.emoji} {ch.name}
            {ch._count?.topics > 0 && (
              <span className={`text-[10px] ${activeChannel === ch.slug ? 'text-violet-200' : 'text-gray-400'}`}>{ch._count.topics}</span>
            )}
          </button>
        ))}
      </div>

      {/* Sort + New topic */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['latest', 'popular', 'artist_replied'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                ${sort === s
                  ? 'bg-white dark:bg-gray-700 text-violet-700 dark:text-violet-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              {s === 'latest' ? '🕐 Son' : s === 'popular' ? '🔥 Popüler' : '🎤 Artist'}
            </button>
          ))}
        </div>
        {user && (
          <button onClick={() => setShowNewTopic(true)} className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm">
            + Konu Aç
          </button>
        )}
      </div>

      {/* Topics */}
      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
      ) : topics?.items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">💬</div>
          <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">Henüz konu yok</p>
          <p className="text-sm">{user ? 'İlk konuyu sen aç!' : 'Giriş yap ve ilk konuyu başlat.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topics?.items.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              currentUserId={user?.id}
              onClick={() => setActiveTopicId(topic.id)}
              onReact={(topicId, emoji) => toggleTopicReaction.mutate({ topicId, emoji })}
            />
          ))}
        </div>
      )}

      {showNewTopic && (
        <NewTopicForm tenantId={tenantId} channels={channels} defaultChannelId={activeChannelObj?.id} onClose={() => setShowNewTopic(false)} />
      )}
    </div>
  );
}
