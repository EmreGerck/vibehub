'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, type AppNotification } from '../../../hooks/useNotifications';
import { useI18n } from '../../../lib/i18n';
import { Spinner } from '../../../components/ui/Spinner';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const t = useI18n((s) => s.t);
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useNotifications(page, PAGE_SIZE);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = data?.items ?? [];
  const shown = filter === 'unread' ? items.filter((n) => !n.readAt) : items;
  const unreadCount = items.filter((n) => !n.readAt).length;

  function handleClick(n: AppNotification) {
    if (!n.readAt) markRead.mutate(n.id);
    const url = (n.data as any)?.url;
    if (url) router.push(url);
    else if ((n.data as any)?.orderId) router.push(`/profile/orders/${(n.data as any).orderId}`);
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('notif.title')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {data?.total ?? 0} {t('notif.totalNotifications')}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
          >
            {t('notif.markAllRead')}
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-4">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
          {t('notif.filterAll')} ({items.length})
        </FilterPill>
        <FilterPill active={filter === 'unread'} onClick={() => setFilter('unread')}>
          {t('notif.filterUnread')} ({unreadCount})
        </FilterPill>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : shown.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl py-16 text-center">
          <div className="text-5xl mb-3">🔔</div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {filter === 'unread' ? t('notif.noUnread') : t('notif.empty')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('notif.emptyHint')}</p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-800">
          {shown.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-3 ${
                n.readAt ? '' : 'bg-purple-50/40 dark:bg-purple-900/10'
              }`}
            >
              <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.readAt ? 'bg-gray-300 dark:bg-gray-700' : 'bg-purple-500'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${n.readAt ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-semibold'}`}>
                  {n.title}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">{n.body}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  {new Date(n.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(data?.total ?? 0) > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-3 mt-4 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.prev')}</button>
          <span className="text-gray-500 dark:text-gray-400">{t('admin.page')} {page}</span>
          <button disabled={items.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.next')}</button>
        </div>
      )}
    </>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? 'bg-purple-600 border-purple-600 text-white'
          : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-purple-400'
      }`}
    >
      {children}
    </button>
  );
}
