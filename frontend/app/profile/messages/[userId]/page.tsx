'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useThread, useSendMessage } from '../../../../hooks/useMessages';
import { useAuthStore } from '../../../../store/auth.store';
import { Spinner } from '../../../../components/ui/Spinner';
import { useI18n } from '../../../../lib/i18n';

export default function ProfileThreadPage() {
  const { userId } = useParams<{ userId: string }>();
  const myUser = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const t = useI18n((s) => s.t);

  const { data, isLoading } = useThread(userId);
  const send = useSendMessage(userId);

  const messages = data?.messages ?? [];
  const partner = data?.partner;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const body = text.trim();
    setText('');
    await send.mutateAsync(body);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <Link href="/profile/messages" className="text-gray-500 hover:text-purple-600 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        {partner?.avatarUrl ? (
          <img
            src={partner.avatarUrl}
            alt={partner.nickname ?? 'User'}
            className="h-10 w-10 rounded-full object-cover shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shrink-0">
            {(partner?.nickname ?? '?')[0].toUpperCase()}
          </div>
        )}

        <div>
          {partner?.nickname ? (
            <Link
              href={`/u/${partner.nickname}`}
              className="font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              @{partner.nickname}
            </Link>
          ) : (
            <p className="font-semibold text-gray-900 dark:text-white">
              {isLoading ? '…' : 'User'}
            </p>
          )}
          {partner?.nickname && (
            <Link href={`/u/${partner.nickname}`} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
              {t('profile.messages.viewProfile')}
            </Link>
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] max-h-[500px] pr-1">
        {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}

        {!isLoading && !messages.length && (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
            <p className="text-sm">No messages yet. Say hi! 👋</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === myUser?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-purple-600 text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && msg.readAt && <span className="ml-1">· seen</span>}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('profile.messages.typeHere')}
          className="input flex-1"
          maxLength={2000}
          autoFocus
        />
        <button
          type="submit"
          disabled={!text.trim() || send.isPending}
          className="btn-primary px-5 disabled:opacity-40"
        >
          {send.isPending ? (
            <Spinner size="sm" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
