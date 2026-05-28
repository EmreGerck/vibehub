'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllNotificationsRead, type AppNotification } from '../../hooks/useNotifications';
import { useI18n } from '../../lib/i18n';

/**
 * Navbar bell icon with badge count + dropdown of recent notifications.
 *
 * - Polls unread count every 30s
 * - Clicking the bell opens a panel showing the latest 10 notifications
 * - Clicking a notification: marks it read + navigates to data.url if present
 * - "Mark all read" button if there's anything unread
 * - "View all →" link to /profile/notifications
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const t = useI18n((s) => s.t);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: page } = useNotifications(1, 10);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        panelRef.current?.contains(e.target as Node) ||
        buttonRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function handleClick(n: AppNotification) {
    if (!n.readAt) markRead.mutate(n.id);
    const url = (n.data as any)?.url;
    setOpen(false);
    if (url) router.push(url);
    else if ((n.data as any)?.orderId) router.push(`/profile/orders/${(n.data as any).orderId}`);
  }

  const items = page?.items ?? [];
  const hasUnread = unreadCount > 0;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={t('notif.openBell')}
        className="relative flex items-center justify-center h-8 w-8 rounded-full text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
      >
        <BellIcon />
        {hasUnread && (
          <span
            key={unreadCount}
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pop"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute top-full right-0 mt-2 w-80 sm:w-96 max-h-[28rem] overflow-hidden rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 origin-top-right animate-scale-in flex flex-col"
          style={{ boxShadow: 'var(--shadow-dropdown)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{t('notif.title')}</h3>
            {hasUnread && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
              >
                {t('notif.markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-10 px-6 text-center">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('notif.empty')}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('notif.emptyHint')}</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 transition-colors flex gap-3 ${
                    n.readAt ? 'opacity-70' : 'bg-purple-50/50 dark:bg-purple-900/10'
                  }`}
                >
                  {/* Unread dot */}
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.readAt ? 'bg-gray-300 dark:bg-gray-700' : 'bg-purple-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${n.readAt ? 'text-gray-700 dark:text-gray-300 font-normal' : 'text-gray-900 dark:text-white font-semibold'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <Link
              href="/profile/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 py-2.5 border-t border-gray-200 dark:border-gray-800 transition-colors"
            >
              {t('notif.viewAll')} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m}d`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}g`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
