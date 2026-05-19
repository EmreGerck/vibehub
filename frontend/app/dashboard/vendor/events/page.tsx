'use client';

import { useMyEvents } from '../../../../hooks/useEvents';
import { useI18n } from '../../../../lib/i18n';
import type { VendorEvent } from '../../../../types';

const PROVIDER_COLORS: Record<string, string> = {
  BILETINO: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  BILETIX: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  BILETINIAL: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  OTHER: 'badge-gray',
};

export default function VendorEventsPage() {
  const t = useI18n((s) => s.t);
  const { data: events, isLoading } = useMyEvents();

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('event.events')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('event.readOnlyDesc')}</p>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : !events?.length ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🎫</p>
          <p>{t('event.noEvents')}</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-5 py-3">{t('event.title')}</th>
                <th className="text-left px-5 py-3">{t('event.date')}</th>
                <th className="text-left px-5 py-3">{t('event.venue')}</th>
                <th className="text-left px-5 py-3">{t('event.provider')}</th>
                <th className="text-left px-5 py-3">{t('admin.status')}</th>
                <th className="text-left px-5 py-3">{t('event.ticketLink')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev: VendorEvent) => (
                <tr key={ev.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{ev.title}</td>
                  <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">{new Date(ev.date).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{ev.venue ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROVIDER_COLORS[ev.provider] ?? 'badge-gray'}`}>{ev.provider}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ev.active ? 'badge-green' : 'badge-red'}`}>
                      {ev.active ? t('event.active') : t('event.inactive')}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <a href={ev.href} target="_blank" rel="noreferrer" className="text-xs text-purple-600 dark:text-purple-400 hover:underline">↗ {t('event.getTickets')}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
