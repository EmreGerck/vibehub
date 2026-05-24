'use client';

import { useState } from 'react';
import { useSecurityOverview, useSecurityEvents, SecurityEvent } from '../../../../hooks/useAdmin';
import { api } from '../../../../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THREAT_CONFIG = {
  low:      { label: 'LOW',      color: 'text-green-600  dark:text-green-400',  bg: 'bg-green-50  dark:bg-green-950',  border: 'border-green-200 dark:border-green-800',  dot: 'bg-green-500'  },
  medium:   { label: 'MEDIUM',   color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950', border: 'border-yellow-200 dark:border-yellow-800', dot: 'bg-yellow-500' },
  high:     { label: 'HIGH',     color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  critical: { label: 'CRITICAL', color: 'text-red-600    dark:text-red-400',    bg: 'bg-red-50    dark:bg-red-950',    border: 'border-red-200    dark:border-red-800',    dot: 'bg-red-500 animate-pulse'    },
};

const SEVERITY_CONFIG = {
  info:     { badge: 'bg-blue-100   dark:bg-blue-900   text-blue-700   dark:text-blue-300',   icon: 'ℹ️' },
  warning:  { badge: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300', icon: '⚠️' },
  critical: { badge: 'bg-red-100    dark:bg-red-900    text-red-700    dark:text-red-300',    icon: '🚨' },
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN_FAILED:            'Failed Login',
  LOGIN_SUCCESS:           'Login Success',
  ACCOUNT_LOCKED:          'Account Locked',
  PASSWORD_RESET:          'Password Reset',
  ADMIN_USER_UPDATE:       'User Updated (Admin)',
  ADMIN_RESET_PASSWORD:    'Password Reset (Admin)',
  PLATFORM_SETTINGS_UPDATE:'Platform Settings Changed',
  PAYOUT_REQUEST:          'Payout Requested',
  PAYOUT_APPROVE:          'Payout Approved',
  PAYOUT_REJECT:           'Payout Rejected',
};

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400)return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function EventRow({ event }: { event: SecurityEvent }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[event.severity];
  const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0;

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        onClick={() => hasMetadata && setExpanded(e => !e)}
        className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${hasMetadata ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer' : 'cursor-default'}`}
      >
        <span className="text-base mt-0.5 shrink-0">{sev.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.badge}`}>
              {event.severity.toUpperCase()}
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {ACTION_LABELS[event.action] ?? event.action}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto shrink-0">
              {timeAgo(event.createdAt)}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
            <span className="font-mono">{event.actorEmail}</span>
            {' → '}
            <span className="font-mono">{event.targetId.slice(0, 24)}{event.targetId.length > 24 ? '…' : ''}</span>
          </div>
        </div>
        {hasMetadata && (
          <svg
            className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>
      {expanded && hasMetadata && (
        <div className="px-4 pb-3 ml-7">
          <pre className="text-xs bg-gray-100 dark:bg-gray-800 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SecurityMonitorPage() {
  const { data: overview, isLoading: overviewLoading, dataUpdatedAt, refetch } = useSecurityOverview();
  const [sendingDigest, setSendingDigest] = useState(false);
  const [digestMsg, setDigestMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const { data: events, isLoading: eventsLoading } = useSecurityEvents({
    page,
    limit: 30,
    action: action || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const threat = overview?.threatLevel ?? 'low';
  const tc = THREAT_CONFIG[threat];

  async function handleSendDigest() {
    setSendingDigest(true);
    setDigestMsg(null);
    try {
      const res = await api.post('/admin/security/send-digest');
      const sent = (res.data as any)?.data?.sent ?? 0;
      setDigestMsg(`✅ Rapor ${sent} alıcıya gönderildi`);
    } catch {
      setDigestMsg('❌ Gönderim başarısız oldu');
    } finally {
      setSendingDigest(false);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🛡️ Güvenlik Monitörü
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Her 30 saniyede otomatik yenileniyor
            {dataUpdatedAt ? ` · Son güncelleme: ${new Date(dataUpdatedAt).toLocaleTimeString('tr-TR')}` : ''}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {overview && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${tc.bg} ${tc.border}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${tc.dot}`} />
              <span className={`text-sm font-bold ${tc.color}`}>Tehdit: {tc.label}</span>
            </div>
          )}
          <button
            onClick={() => refetch()}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            🔄 Yenile
          </button>
          <button
            onClick={handleSendDigest}
            disabled={sendingDigest}
            className="px-4 py-2 text-sm rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {sendingDigest ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" /> Gönderiliyor…</>
            ) : '📧 Raporu Şimdi Gönder'}
          </button>
          {digestMsg && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{digestMsg}</span>
          )}
        </div>
      </div>

      {overviewLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : overview ? (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: 'Başarısız Giriş (1s)', value: overview.summary.failedLogins1h,       icon: '🔴', alert: overview.summary.failedLogins1h >= 5 },
              { label: 'Başarısız Giriş (24s)', value: overview.summary.failedLogins24h,     icon: '⚠️', alert: overview.summary.failedLogins24h >= 20 },
              { label: 'Hesap Kilitlenme (24s)', value: overview.summary.accountLocks24h,    icon: '🔒', alert: overview.summary.accountLocks24h >= 1 },
              { label: 'Şifre Sıfırlama (24s)', value: overview.summary.passwordResets24h,  icon: '🔑', alert: false },
              { label: 'Şüpheli İşlem (24s)', value: overview.summary.suspiciousActions24h, icon: '🚨', alert: overview.summary.suspiciousActions24h >= 10 },
              { label: 'Kilitli Hesap (Toplam)', value: overview.summary.totalUsersLocked,  icon: '🔐', alert: overview.summary.totalUsersLocked >= 1 },
              { label: 'Yeni Kayıt (24s)', value: overview.summary.newUsers24h,             icon: '👤', alert: false },
              { label: 'Brute Force Hedefi', value: overview.summary.bruteForceTargets.length, icon: '💣', alert: overview.summary.bruteForceTargets.length > 0 },
            ].map(({ label, value, icon, alert }) => (
              <div
                key={label}
                className={`rounded-2xl border p-4 ${
                  alert
                    ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">{icon}</span>
                  {alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </div>
                <div className={`text-2xl font-bold ${alert ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* System health */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">🖥️ Sistem Sağlığı</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(overview.systemHealth).map(([key, check]) => (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    check.ok
                      ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                  }`}
                >
                  <span className="text-xl">{check.ok ? '✅' : '❌'}</span>
                  <div>
                    <div className={`text-sm font-medium ${check.ok ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {{
                        database: 'Veritabanı',
                        orderProcessing: 'Sipariş İşleme',
                        payouts: 'Ödeme Onayları',
                      }[key] ?? key}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {check.latencyMs !== undefined ? `${check.latencyMs}ms` : check.detail ?? ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Brute force targets */}
          {overview.summary.bruteForceTargets.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950 rounded-2xl border border-red-200 dark:border-red-800 p-5">
              <h2 className="font-semibold text-red-700 dark:text-red-300 mb-3">💣 Brute Force Hedefleri (Son 1 Saat)</h2>
              <div className="space-y-2">
                {overview.summary.bruteForceTargets.map(t => (
                  <div key={t.targetId} className="flex items-center justify-between bg-white/60 dark:bg-black/30 rounded-lg px-3 py-2">
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{t.targetId}</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{t.attempts} deneme</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent events from overview */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">🕐 Son Güvenlik Olayları (7 gün)</h2>
              <span className="text-xs text-gray-400">{overview.recentEvents.length} olay</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {overview.recentEvents.slice(0, 20).map(e => (
                <EventRow key={e.id} event={e} />
              ))}
              {overview.recentEvents.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-gray-400">Güvenlik olayı bulunamadı</div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Full event log with filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">🔍 Güvenlik Olay Logu</h2>
          <div className="flex flex-wrap gap-3">
            <select
              value={action}
              onChange={e => { setAction(e.target.value); setPage(1); }}
              className="input text-sm w-auto"
            >
              <option value="">Tüm olaylar</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 shrink-0">Başlangıç</label>
              <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="input text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 shrink-0">Bitiş</label>
              <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="input text-sm" />
            </div>
            {(action || fromDate || toDate) && (
              <button
                onClick={() => { setAction(''); setFromDate(''); setToDate(''); setPage(1); }}
                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 px-2 py-1 rounded"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        </div>

        {eventsLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto" />
          </div>
        ) : (
          <>
            <div>
              {events?.data.map(e => <EventRow key={e.id} event={e} />)}
              {events?.data.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-gray-400">Olay bulunamadı</div>
              )}
            </div>

            {events && events.pages > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Sayfa {events.page} / {events.pages} · {events.total} toplam olay
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    ← Önceki
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(events.pages, p + 1))}
                    disabled={page >= events.pages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Sonraki →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
