'use client';

import { useMemo, useState } from 'react';
import {
  useTradeLedger,
  useTradeLedgerDetail,
  buildExportUrl,
  type TradeLedgerFilters,
  type TradeLedgerOrder,
} from '../../../../hooks/useTradeLedger';
import { useAdminVendors } from '../../../../hooks/useAdmin';
import { useAuthStore } from '../../../../store/auth.store';
import { api } from '../../../../lib/api';

const STATUSES = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'] as const;
const PRESETS: Array<{ key: string; label: string; days: number | null }> = [
  { key: 'today',  label: 'Bugün',       days: 0   },
  { key: '7d',     label: 'Son 7 gün',   days: 7   },
  { key: '30d',    label: 'Son 30 gün',  days: 30  },
  { key: '90d',    label: 'Son 90 gün',  days: 90  },
  { key: 'all',    label: 'Tümü',        days: null },
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const fmtTRY = (n: number, currency = 'TRY') =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(n);

export default function TradeLedgerPage() {
  const user  = useAuthStore((s) => s.user);
  const isGod = user?.role === 'GOD_USER';

  const [preset, setPreset] = useState<string>('30d');
  const [dateFrom, setDateFrom] = useState<string>(isoDate(new Date(Date.now() - 30 * 86_400_000)));
  const [dateTo,   setDateTo]   = useState<string>(isoDate(new Date()));
  const [tenantId, setTenantId] = useState('');
  const [status,   setStatus]   = useState('');
  const [fulfilment, setFulfilment] = useState('');
  const [hasReview,  setHasReview]  = useState('');
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [detailFor,  setDetailFor]  = useState<string | null>(null);

  const filters: TradeLedgerFilters = useMemo(() => ({
    page,
    limit: 20,
    dateFrom: preset === 'all' ? undefined : dateFrom,
    dateTo:   preset === 'all' ? undefined : dateTo,
    tenantId: tenantId || undefined,
    status:   status   || undefined,
    fulfilment: fulfilment || undefined,
    hasReview:  hasReview  || undefined,
    search:     search.trim() || undefined,
  }), [page, preset, dateFrom, dateTo, tenantId, status, fulfilment, hasReview, search]);

  const { data, isLoading } = useTradeLedger(filters);
  const { data: vendorList } = useAdminVendors({ limit: 100 });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  function applyPreset(key: string) {
    setPreset(key);
    setPage(1);
    if (key === 'all') return;
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset || preset.days === null) return;
    const to = new Date();
    const from = new Date(Date.now() - preset.days * 86_400_000);
    setDateFrom(isoDate(from));
    setDateTo(isoDate(to));
  }

  async function handleExport() {
    // Stream the CSV using the same auth as the rest of the SPA, then trigger
    // a synthetic download from the response blob. Bypasses the SPA router
    // (which would intercept a plain href) and keeps the Bearer token attached.
    const res = await api.get(buildExportUrl(filters), { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibehub-trade-ledger-${isoDate(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  const STATUS_COLOR: Record<string, string> = {
    PLACED:           'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    CONFIRMED:        'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    SHIPPED:          'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    DELIVERED:        'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    CANCELLED:        'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    REFUND_REQUESTED: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    REFUNDED:         'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  };

  const FULFILMENT_BADGE: Record<string, { label: string; cls: string }> = {
    VIBEHUB: { label: '🏭 VibeHub',  cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
    VENDOR:  { label: '🏪 Satıcı',   cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' },
    BOTH:    { label: '🔀 Karma',    cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Satış Geçmişi</h1>
          <p className="text-gray-400 text-sm mt-1">
            Tüm satışlar, filtrelenebilir bir tablo halinde. Detay için satıra tıkla. Para parçalanması (KDV, üretim maliyeti, satıcı, platform) sipariş anında dondurulmuştur — sonradan yapılan ürün düzenlemeleri burada görünmez.
          </p>
        </div>
        {isGod && (
          <button onClick={handleExport} className="btn-ghost text-sm">
            📥 CSV İndir
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                preset === p.key
                  ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                  : 'border-surface-border text-gray-400 hover:border-brand-500/40'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="label text-xs">Başlangıç</label>
            <input
              type="date"
              className="input w-full text-sm"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPreset('custom'); setPage(1); }}
              disabled={preset === 'all'}
            />
          </div>
          <div>
            <label className="label text-xs">Bitiş</label>
            <input
              type="date"
              className="input w-full text-sm"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPreset('custom'); setPage(1); }}
              disabled={preset === 'all'}
            />
          </div>
          <div>
            <label className="label text-xs">Satıcı</label>
            <select className="input w-full text-sm" value={tenantId} onChange={(e) => { setTenantId(e.target.value); setPage(1); }}>
              <option value="">Tümü</option>
              {(vendorList?.items ?? []).map((v: any) => (
                <option key={v.id} value={v.id}>{v.displayName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Durum</label>
            <select className="input w-full text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">Tümü</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Fulfilment</label>
            <select className="input w-full text-sm" value={fulfilment} onChange={(e) => { setFulfilment(e.target.value); setPage(1); }}>
              <option value="">Tümü</option>
              <option value="VIBEHUB_MANAGED">🏭 VibeHub gönderir</option>
              <option value="VENDOR_MANAGED">🏪 Satıcı gönderir</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">Yorum</label>
            <select className="input w-full text-sm" value={hasReview} onChange={(e) => { setHasReview(e.target.value); setPage(1); }}>
              <option value="">Tümü</option>
              <option value="true">Yorum yazılmış</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs">Ara (sipariş ID, e-posta, ödeme ref, takip no)</label>
            <input
              type="search"
              className="input w-full text-sm"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="ör. abc123, ali@gmail.com, ARAS-12345..."
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">Bu filtrelerle eşleşen sipariş bulunamadı.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-surface-2 text-gray-400 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Sipariş</th>
                <th className="text-left px-4 py-3 font-medium">Tarih</th>
                <th className="text-left px-4 py-3 font-medium">Müşteri</th>
                <th className="text-left px-4 py-3 font-medium">Satıcı(lar)</th>
                <th className="text-right px-4 py-3 font-medium">Tutar</th>
                <th className="text-center px-4 py-3 font-medium">Mod</th>
                <th className="text-center px-4 py-3 font-medium">Durum</th>
                <th className="text-center px-4 py-3 font-medium">Yorum</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setDetailFor(o.id)}
                  className="border-t border-surface-border hover:bg-surface-2/40 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{o.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(o.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td className="px-4 py-3 text-gray-300">{o.customer?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {o.vendors.length === 0 ? '—'
                      : o.vendors.length === 1 ? o.vendors[0].displayName
                      : `${o.vendors[0].displayName} +${o.vendors.length - 1}`}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium tabular-nums">{fmtTRY(o.money.gross, o.currency)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${FULFILMENT_BADGE[o.fulfilmentMix].cls}`}>
                      {FULFILMENT_BADGE[o.fulfilmentMix].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[o.status] ?? 'bg-gray-800 text-gray-300'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">{o.hasReview ? '✓' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > (filters.limit ?? 20) && (
        <div className="flex items-center justify-end gap-3 mt-4 text-sm text-gray-400">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">← Önceki</button>
          <span>Sayfa {page} / {Math.ceil(total / (filters.limit ?? 20))}</span>
          <button disabled={items.length < (filters.limit ?? 20)} onClick={() => setPage((p) => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">Sonraki →</button>
        </div>
      )}

      {detailFor && (
        <DetailDrawer orderId={detailFor} onClose={() => setDetailFor(null)} />
      )}
    </div>
  );
}

// ─── Detail drawer ──────────────────────────────────────────────────────────

function DetailDrawer({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { data, isLoading } = useTradeLedgerDetail(orderId);
  const fmt = (n: number, currency = 'TRY') => fmtTRY(n, currency);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface w-full max-w-2xl h-full overflow-y-auto border-l border-surface-border"
      >
        <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sipariş Detayı</h2>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{orderId}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl leading-none">×</button>
        </div>

        {isLoading || !data ? (
          <p className="p-6 text-gray-400">Yükleniyor…</p>
        ) : (
          <div className="px-6 py-5 space-y-6">
            {/* Genel */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Genel</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Kv label="Tarih"    value={new Date(data.createdAt).toLocaleString('tr-TR')} />
                <Kv label="Durum"    value={data.status} />
                <Kv label="Müşteri"  value={data.customer?.email ?? '—'} />
                <Kv label="Ödeme Ref" value={data.paymentRef ?? '—'} mono />
                <Kv label="Fatura No" value={data.invoiceNumber ?? '—'} mono />
                <Kv label="Para Birimi" value={data.currency} />
              </div>
            </section>

            {/* Ürünler — per-line money breakdown */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Ürünler & Para Parçalanması</h3>
              <div className="space-y-3">
                {data.itemsDetailed.map((it) => (
                  <div key={it.id} className="rounded-lg border border-surface-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{it.productTitle}</p>
                        <p className="text-xs text-gray-400">{it.tenant?.displayName} · {it.qty} adet × {fmt(it.unitPrice, data.currency)}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        it.fulfilment === 'VIBEHUB_MANAGED'
                          ? 'bg-purple-900/40 text-purple-300'
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        {it.fulfilment === 'VIBEHUB_MANAGED' ? '🏭 VibeHub' : '🏪 Satıcı'}
                      </span>
                    </div>
                    <div className="mt-2 text-xs grid grid-cols-2 gap-1">
                      <Money label="Satır toplamı"  value={it.lineTotal}    currency={data.currency} />
                      {it.fulfilment === 'VIBEHUB_MANAGED' && it.manufacturingCost != null && (
                        <Money label={`− Üretim (${it.manufacturingUnitName ?? '—'})`} value={it.manufacturingCost} currency={data.currency} />
                      )}
                      <Money label="→ Satıcı kazancı" value={it.vendorPayout} currency={data.currency} highlight="purple" />
                      {it.fulfilment === 'VIBEHUB_MANAGED' && it.platformShare != null ? (
                        <Money label="→ VibeHub kazancı" value={it.platformShare} currency={data.currency} highlight="orange" />
                      ) : (
                        <Money label={`→ VibeHub komisyonu (%${(it.commissionRate * 100).toFixed(0)})`} value={it.lineTotal - it.vendorPayout} currency={data.currency} highlight="orange" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Order-level totals */}
              <div className="mt-3 rounded-lg bg-surface-2/60 px-3 py-2 text-sm grid grid-cols-2 gap-1">
                <Money label="Brüt"          value={data.money.gross}    currency={data.currency} />
                {data.money.vat > 0  && <Money label="KDV (yaklaşık)" value={data.money.vat} currency={data.currency} />}
                {data.money.mfg > 0  && <Money label="Üretim toplamı"  value={data.money.mfg} currency={data.currency} />}
                <Money label="Satıcı toplamı" value={data.money.vendor}  currency={data.currency} highlight="purple" />
                <Money label="VibeHub toplamı" value={data.money.platform} currency={data.currency} highlight="orange" />
              </div>
            </section>

            {/* Kargo */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Kargo</h3>
              {data.shipments.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Henüz kargo oluşturulmamış.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {data.shipments.map((s: any) => (
                    <li key={s.id} className="flex items-center justify-between text-gray-300">
                      <span>{s.carrier} · <span className="font-mono text-xs">{s.trackingNumber}</span></span>
                      <span className="text-xs text-gray-500">{s.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* İade */}
            {data.returnShipment && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">İade</h3>
                <div className="text-sm text-gray-300">
                  Barkod: <span className="font-mono text-xs">{(data.returnShipment as any).returnBarcode}</span> · Durum: {(data.returnShipment as any).status}
                </div>
              </section>
            )}

            {/* Yorumlar */}
            {data.reviews.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Müşteri Yorumları</h3>
                <ul className="space-y-2">
                  {data.reviews.map((r) => (
                    <li key={r.id} className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
                      <div className="text-amber-400 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                      <p className="text-gray-300 mt-1">{r.comment || '—'}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Audit timeline */}
            {data.auditEntries.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Olay Akışı</h3>
                <ul className="space-y-1.5 text-xs text-gray-400 font-mono">
                  {data.auditEntries.map((a) => (
                    <li key={a.id}>
                      {new Date(a.createdAt).toLocaleString('tr-TR')} — <span className="text-gray-200">{a.action}</span> {a.actorId ? `(by ${a.actorId.slice(0, 8)})` : ''}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Kv({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm text-gray-900 dark:text-white ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function Money({ label, value, currency, highlight }: { label: string; value: number; currency: string; highlight?: 'purple' | 'orange' }) {
  const cls = highlight === 'purple'
    ? 'text-purple-300'
    : highlight === 'orange'
    ? 'text-orange-300'
    : 'text-gray-300';
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={`tabular-nums font-medium ${cls}`}>{fmtTRY(value, currency)}</span>
    </div>
  );
}
