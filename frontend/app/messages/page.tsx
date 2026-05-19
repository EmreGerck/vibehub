'use client';

import Link from 'next/link';
import { useConversations } from '../../hooks/useMessages';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Spinner } from '../../components/ui/Spinner';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesPage() {
  const { data: conversations, isLoading } = useConversations();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Navbar />
      <div className="flex-1 mx-auto max-w-2xl w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Messages</h1>

        {isLoading && <div className="flex justify-center py-12"><Spinner /></div>}

        {!isLoading && !conversations?.length && (
          <div className="text-center py-20 text-gray-400 dark:text-gray-600">
            <p className="text-5xl mb-4">💬</p>
            <p className="text-lg">No messages yet</p>
            <p className="text-sm mt-2">Visit someone's profile to start a conversation</p>
          </div>
        )}

        {conversations && conversations.length > 0 && (
          <div className="card divide-y divide-gray-100 dark:divide-gray-800">
            {conversations.map((c) => (
              <Link
                key={c.userId}
                href={`/messages/${c.userId}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {c.avatarUrl ? (
                  <img
                    src={c.avatarUrl}
                    alt={c.nickname ?? '?'}
                    className="h-12 w-12 rounded-full object-cover shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shrink-0">
                    {(c.nickname ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {c.nickname ? `@${c.nickname}` : 'Unknown user'}
                    {c.unread > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-purple-600 text-white text-[10px] font-bold">
                        {c.unread}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{c.lastMessage}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.lastMessageAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
