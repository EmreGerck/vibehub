'use client';

import Link from 'next/link';
import { useMyVisitors } from '../../../hooks/useSocialProfile';
import { Spinner } from '../../../components/ui/Spinner';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function VisitorsPage() {
  const { data: visitors, isLoading } = useMyVisitors();

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">Who visited your profile</h2>

      {isLoading && <Spinner />}

      {!isLoading && !visitors?.length && (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          <p className="text-5xl mb-4">👁</p>
          <p className="text-lg">No visits yet</p>
          <p className="text-sm mt-2">Share your profile link to get visitors!</p>
        </div>
      )}

      {visitors && visitors.length > 0 && (
        <div className="space-y-2 max-w-lg">
          {visitors.map((v) => (
            <div key={v.userId} className="card p-4 flex items-center gap-4">
              {v.avatarUrl ? (
                <img
                  src={v.avatarUrl}
                  alt={v.nickname ?? '?'}
                  className="h-11 w-11 rounded-full object-cover shrink-0"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {(v.nickname ?? '?')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {v.nickname ? (
                  <Link
                    href={`/u/${v.nickname}`}
                    className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    @{v.nickname}
                  </Link>
                ) : (
                  <span className="font-medium text-gray-500 italic">Anonymous</span>
                )}
                <p className="text-xs text-gray-500 mt-0.5">{timeAgo(v.visitedAt)}</p>
              </div>
              {v.nickname && (
                <Link
                  href={`/profile/messages/${v.userId}`}
                  className="text-xs btn-ghost px-3 py-1.5 shrink-0"
                >
                  Message
                </Link>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
            Ghost-mode visitors are hidden. Showing last 200 unique visitors.
          </p>
        </div>
      )}
    </>
  );
}
