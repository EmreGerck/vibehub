'use client';

import { useState } from 'react';
import { useAdminOrders } from '../../../../hooks/useOrders';
import { useAdminCancelOrder } from '../../../../hooks/useAdmin';
import {
  useAdminApproveRefund,
  useAdminRejectRefund,
  useAdminCreateShipment,
  useAdminConfirmDepotArrival,
  useOrderReturnShipment,
} from '../../../../hooks/useCart';
import { useI18n } from '../../../../lib/i18n';
import { formatPrice } from '../../../../lib/format';
import { Spinner } from '../../../../components/ui/Spinner';

const STATUS_COLORS: Record<string, string> = {
  PLACED:            'badge-yellow',
  CONFIRMED:         'badge-blue',
  SHIPPED:           'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full font-medium',
  DELIVERED:         'badge-green',
  CANCELLED:         'badge-red',
  REFUND_REQUESTED:  'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse',
  REFUNDED:          'badge-gray',
};

const STATUS_LABELS: Record<string, string> = {
  PLACED:           'Alındı',
  CONFIRMED:        'Onaylandı',
  SHIPPED:          'Kargoda',
  DELIVERED:        'Teslim Edildi',
  CANCELLED:        'İptal',
  REFUND_REQUESTED: '⚠️ İade Bekliyor',
  REFUNDED:         'İade Edildi',
};

// ── Create Shipment Modal ─────────────────────────────────────────────────────
function CreateShipmentModal({ order, onClose }: { order: any; onClose: () => void }) {
  const createShipment = useAdminCreateShipment();
  const addr = order.shippingAddress ?? {};
  const [form, setForm] = useState({
    carrier:         'aras' as 'aras' | 'yurtici',
    weight:          '0.5',
    description:     `VibeHub Sipariş #${order.id.slice(0, 8).toUpperCase()}`,
    receiverName:    addr.name ?? '',
    receiverPhone:   addr.phone ?? '',
    receiverAddress: [addr.line1, addr.line2].filter(Boolean).join(', '),
    receiverCity:    addr.city ?? '',
    receiverDistrict: addr.state ?? '',
  });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState<{ trackingNumber: string; carrier: string } | null>(null);

  function update(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    setError('');
    if (!form.receiverName.trim())    { setError('Alıcı adı boş bırakılamaz.'); return; }
    if (!form.receiverAddress.trim()) { setError('Adres boş bırakılamaz.'); return; }
    if (!form.receiverCity.trim())    { setError('Şehir boş bırakılamaz.'); return; }
    const weight = parseFloat(form.weight);
    if (!weight || weight <= 0)       { setError('Geçerli bir ağırlık girin (kg).'); return; }

    try {
      const result = await createShipment.mutateAsync({
        orderId:          order.id,
        carrier:          form.carrier,
        receiverName:     form.receiverName,
        receiverPhone:    form.receiverPhone,
        receiverAddress:  form.receiverAddress,
        receiverCity:     form.receiverCity,
        receiverDistrict: form.receiverDistrict,
        weight,
        description:      form.description,
      });
      setSuccess({ trackingNumber: result.trackingNumber, carrier: result.carrier });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Kargo oluşturulamadı');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        <div className="bg-purple-50 dark:bg-purple-900/30 border-b border-purple-200 dark:border-purple-800 px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">🚚</span>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Kargo Oluştur</h3>
            <p className="text-xs font-mono text-gray-500 mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {success ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-5 text-center">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-bold text-green-800 dark:text-green-300">Kargo Oluşturuldu!</p>
                <div className="mt-3 bg-white dark:bg-gray-900 rounded-lg p-3 font-mono">
                  <p className="text-xs text-gray-500 mb-1">Takip Numarası</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white tracking-widest">{success.trackingNumber}</p>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{success.carrier}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Müşteriye kargo bilgisi e-posta ile gönderildi.
                </p>
              </div>
              <button onClick={onClose} className="w-full btn-primary">Kapat</button>
            </div>
          ) : (
            <>
              {/* Carrier */}
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Kargo Firması</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['aras', 'yurtici'] as const).map(c => (
                    <button
                      key={c}
                      onClick={() => update('carrier', c)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        form.carrier === c
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {c === 'aras' ? '🟠 Aras Kargo' : '🔵 Yurtiçi Kargo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Receiver info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Alıcı Adı <span className="text-red-500">*</span></label>
                  <input className="input w-full" value={form.receiverName} onChange={e => update('receiverName', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Alıcı Telefonu</label>
                  <input className="input w-full" value={form.receiverPhone} onChange={e => update('receiverPhone', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Adres <span className="text-red-500">*</span></label>
                <input className="input w-full" value={form.receiverAddress} onChange={e => update('receiverAddress', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Şehir <span className="text-red-500">*</span></label>
                  <input className="input w-full" value={form.receiverCity} onChange={e => update('receiverCity', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">İlçe</label>
                  <input className="input w-full" value={form.receiverDistrict} onChange={e => update('receiverDistrict', e.target.value)} />
                </div>
              </div>

              {/* Package info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Ağırlık (kg) <span className="text-red-500">*</span></label>
                  <input
                    type="number" step="0.1" min="0.1"
                    className="input w-full"
                    value={form.weight}
                    onChange={e => update('weight', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">İçerik Açıklaması</label>
                  <input className="input w-full" value={form.description} onChange={e => update('description', e.target.value)} />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 btn-ghost text-sm">Vazgeç</button>
                <button
                  onClick={handleSubmit}
                  disabled={createShipment.isPending}
                  className="flex-1 py-2 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {createShipment.isPending
                    ? <span className="flex items-center justify-center gap-1"><Spinner size="sm" /> Oluşturuluyor…</span>
                    : '🚚 Kargo Oluştur'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Depot arrival button (inside expanded row) ────────────────────────────────
function DepotArrivalRow({ orderId }: { orderId: string }) {
  const { data: rs } = useOrderReturnShipment(orderId, true);
  const confirm      = useAdminConfirmDepotArrival();
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);

  if (!rs || rs.status !== 'INITIATED' && rs.status !== 'DROPPED_OFF' && rs.status !== 'IN_TRANSIT') return null;

  return (
    <div className="mt-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">İade Kargo Takibi</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            Barkod: <span className="font-mono">{rs.returnBarcode}</span>
            {' · '}Durum: {rs.status}
          </p>
        </div>
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            🏭 Depoya Ulaştı
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap w-full mt-2">
            <input
              className="input flex-1 min-w-[160px] text-xs"
              placeholder="Admin notu (isteğe bağlı)…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <button
              onClick={() => setOpen(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700"
            >
              Vazgeç
            </button>
            <button
              disabled={confirm.isPending}
              onClick={() => confirm.mutate({ orderId, note: note || undefined }, { onSuccess: () => setOpen(false) })}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {confirm.isPending ? <Spinner size="sm" /> : 'Onayla'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Refund Review Modal ───────────────────────────────────────────────────────
function RefundReviewModal({
  order,
  onClose,
}: {
  order: any;
  onClose: () => void;
}) {
  const approve = useAdminApproveRefund();
  const reject  = useAdminRejectRefund();
  const [note,   setNote]   = useState('');
  const [mode,   setMode]   = useState<'idle' | 'approve' | 'reject'>('idle');
  const [error,  setError]  = useState('');

  async function handleApprove() {
    setError('');
    try {
      await approve.mutateAsync({ orderId: order.id, note: note || undefined });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'İşlem başarısız');
    }
  }

  async function handleReject() {
    if (!note.trim()) { setError('Reddetme gerekçesi boş bırakılamaz.'); return; }
    setError('');
    try {
      await reject.mutateAsync({ orderId: order.id, note });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'İşlem başarısız');
    }
  }

  const isPending = approve.isPending || reject.isPending;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-6 py-4 flex items-start gap-3">
          <span className="text-2xl">↩️</span>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">İade Talebi İnceleme</h3>
            <p className="text-xs font-mono text-gray-500 mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Order summary */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Müşteri</p>
              <p className="font-medium text-gray-900 dark:text-white truncate">{order.customer?.email}</p>
              {order.customer?.name && <p className="text-xs text-gray-500">{order.customer.name}</p>}
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">İade Tutarı</p>
              <p className="font-bold text-lg text-purple-600 dark:text-purple-400">{formatPrice(order.totalAmount)}</p>
            </div>
          </div>

          {/* Refund reason */}
          {order.refundReason && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-2">
                Müşterinin Belirttiği Neden
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{order.refundReason}"</p>
              {order.refundRequestedAt && (
                <p className="text-xs text-amber-500 dark:text-amber-400 mt-2">
                  Talep tarihi: {new Date(order.refundRequestedAt).toLocaleString('tr-TR')}
                </p>
              )}
            </div>
          )}

          {/* Items */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sipariş İçeriği</p>
            <div className="space-y-2">
              {(order.items ?? []).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                    {item.variant?.product?.title ?? 'Ürün'} × {item.qty}
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium ml-3">
                    {formatPrice(Number(item.unitPriceSnapshot) * item.qty)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Action selector */}
          {mode === 'idle' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('approve')}
                className="py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                ✅ İadeyi Onayla
              </button>
              <button
                onClick={() => setMode('reject')}
                className="py-3 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                ❌ Reddet
              </button>
            </div>
          )}

          {mode === 'approve' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                  İade Onayı — {formatPrice(order.totalAmount)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Müşteriye "İadeniz onaylandı" e-postası ve push bildirimi gönderilecek.
                  Ödeme iadesini ödeme sağlayıcısından manuel olarak başlatmayı unutmayın.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                  Müşteriye not (isteğe bağlı)
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Örnek: İadeniz 5-10 iş günü içinde hesabınıza yansıyacaktır."
                  className="input w-full h-20 resize-none text-sm"
                  maxLength={500}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setMode('idle'); setNote(''); }} className="flex-1 btn-ghost text-sm">Geri</button>
                <button
                  onClick={handleApprove}
                  disabled={isPending}
                  className="flex-1 py-2 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isPending ? <span className="flex items-center justify-center gap-1"><Spinner size="sm" /> İşleniyor…</span> : 'Onayla ve Bildir'}
                </button>
              </div>
            </div>
          )}

          {mode === 'reject' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                  İade Reddi
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Sipariş durumu "Teslim Edildi" olarak geri döner. Müşteriye red e-postası ve push bildirimi gönderilecek.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                  Red gerekçesi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Örnek: Ürün kullanılmış ve orijinal ambalajı açılmış olduğundan cayma hakkı kapsamı dışındadır."
                  className="input w-full h-24 resize-none text-sm"
                  maxLength={1000}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setMode('idle'); setNote(''); }} className="flex-1 btn-ghost text-sm">Geri</button>
                <button
                  onClick={handleReject}
                  disabled={isPending || !note.trim()}
                  className="flex-1 py-2 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isPending ? <span className="flex items-center justify-center gap-1"><Spinner size="sm" /> İşleniyor…</span> : 'Reddet ve Bildir'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main admin orders page ─────────────────────────────────────────────────────
export default function AdminOrdersPage() {
  const t = useI18n((s) => s.t);
  const [page,           setPage]           = useState(1);
  const [statusFilter,   setStatusFilter]   = useState('');
  const [search,         setSearch]         = useState('');
  const [expanded,       setExpanded]       = useState<string | null>(null);
  const [actionModal,    setActionModal]    = useState<{ order: any; kind: 'cancel' } | null>(null);
  const [refundModal,    setRefundModal]    = useState<any | null>(null);
  const [shipmentModal,  setShipmentModal]  = useState<any | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionRestock, setActionRestock] = useState(true);
  const [actionError,   setActionError]   = useState('');

  const { data, isLoading } = useAdminOrders({ page, limit: 20, status: statusFilter || undefined });
  const { data: pendingRefunds } = useAdminOrders({ page: 1, limit: 50, status: 'REFUND_REQUESTED' });

  // Client-side filter for order ID / customer email until backend search lands
  const displayedOrders = (() => {
    if (!search.trim() || !data?.items) return data?.items ?? [];
    const q = search.trim().toLowerCase();
    return data.items.filter((o: any) =>
      o.id?.toLowerCase().includes(q) ||
      o.customer?.email?.toLowerCase().includes(q) ||
      o.customer?.name?.toLowerCase().includes(q) ||
      o.paymentRef?.toLowerCase().includes(q),
    );
  })();
  const cancel = useAdminCancelOrder();

  const refundCount = pendingRefunds?.items?.length ?? 0;

  function openAction(order: any, kind: 'cancel') {
    setActionModal({ order, kind });
    setActionReason('');
    setActionRestock(true);
    setActionError('');
  }

  async function runAction() {
    if (!actionModal) return;
    setActionError('');
    try {
      await cancel.mutateAsync({ id: actionModal.order.id, reason: actionReason || undefined, restock: actionRestock });
      setActionModal(null);
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Action failed');
    }
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.orders')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{data?.total ?? 0} {t('admin.allVendors')}</p>
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">{t('admin.allStatuses')}</option>
          <option value="PLACED">{t('admin.placed')}</option>
          <option value="CONFIRMED">{t('admin.confirmed')}</option>
          <option value="SHIPPED">{t('admin.shipped')}</option>
          <option value="DELIVERED">{t('admin.delivered')}</option>
          <option value="CANCELLED">{t('admin.cancelled')}</option>
          <option value="REFUND_REQUESTED">⚠️ İade Bekliyor</option>
          <option value="REFUNDED">{t('admin.refunded')}</option>
        </select>
      </div>

      {/* Search box — order ID, customer email, name, payment ref */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Sipariş ID, müşteri e-posta, isim veya ödeme ref ile ara…"
            className="input pl-10 w-full"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔎</span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
              aria-label="Aramayı temizle"
            >
              ✕
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            {displayedOrders.length} sonuç ({data?.items?.length ?? 0} arasında)
          </p>
        )}
      </div>

      {/* ── Pending refund alert banner ─────────────────────────────────────── */}
      {refundCount > 0 && !statusFilter && (
        <div
          className="mb-6 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 p-4 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          onClick={() => setStatusFilter('REFUND_REQUESTED')}
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-400 dark:bg-amber-500 flex items-center justify-center shrink-0 animate-pulse">
              <span className="text-white text-2xl">↩️</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-800 dark:text-amber-200 text-lg">
                {refundCount} Bekleyen İade Talebi
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                Müşteriler onay bekliyor — incelemek için tıklayın
              </p>
            </div>
            <div className="text-amber-600 dark:text-amber-400 text-2xl font-bold">
              →
            </div>
          </div>
          {/* Quick list of waiting orders */}
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingRefunds?.items?.slice(0, 5).map((o: any) => (
              <button
                key={o.id}
                onClick={e => { e.stopPropagation(); setRefundModal(o); }}
                className="text-xs bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/40 transition-colors font-mono"
              >
                #{o.id.slice(0, 8).toUpperCase()} · {formatPrice(o.totalAmount)}
              </button>
            ))}
            {refundCount > 5 && (
              <span className="text-xs text-amber-500 dark:text-amber-400 self-center">+{refundCount - 5} daha</span>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-400 text-center py-12">{t('admin.loading')}</p>
      ) : (
        <>
          <div className="card overflow-x-auto mb-4">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3">{t('admin.order')}</th>
                  <th className="text-left px-5 py-3">{t('admin.customer')}</th>
                  <th className="text-left px-5 py-3">{t('admin.vendors_col')}</th>
                  <th className="text-left px-5 py-3">{t('cart.total')}</th>
                  <th className="text-left px-5 py-3">{t('admin.status')}</th>
                  <th className="text-left px-5 py-3">{t('admin.date')}</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              {displayedOrders.map((order: any) => (
                <tbody key={order.id}>
                    <tr
                      className={`border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-colors ${
                        order.status === 'REFUND_REQUESTED' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                      }`}
                      onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {order.id.slice(0, 8)}…
                        {order.status === 'REFUND_REQUESTED' && (
                          <span className="ml-2 text-amber-500">⚠️</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs">{order.customer?.email}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs">
                        {Array.from(new Set<string>((order.items ?? []).map((i: any) => i.tenant?.displayName))).join(', ')}
                      </td>
                      <td className="px-5 py-3 text-gray-900 dark:text-white font-medium">{formatPrice(order.totalAmount)}</td>
                      <td className="px-5 py-3">
                        <span className={STATUS_COLORS[order.status] ?? 'badge-gray'}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-5 py-3 text-gray-400">{expanded === order.id ? '▲' : '▼'}</td>
                    </tr>

                    {expanded === order.id && (
                      <tr className={`border-b border-gray-200 dark:border-gray-800 ${
                        order.status === 'REFUND_REQUESTED' ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-gray-50 dark:bg-gray-900/30'
                      }`}>
                        <td colSpan={7} className="px-5 py-4">
                          <div className="space-y-2">
                            {(order.items ?? []).map((item: any) => (
                              <div key={item.id} className="flex items-center gap-3 text-sm">
                                <span className="text-gray-600 dark:text-gray-300 text-xs font-mono w-24 truncate">{item.variant?.product?.title}</span>
                                <span className="text-gray-500 text-xs">SKU: {item.variant?.sku}</span>
                                <span className="text-gray-700 dark:text-gray-300">×{item.qty}</span>
                                <span className="text-gray-900 dark:text-white">{formatPrice(item.unitPriceSnapshot)}</span>
                                <span className="text-purple-600 dark:text-purple-400 text-xs">{t('common.via')} {item.tenant?.displayName}</span>
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                            {t('admin.shipTo')}: {order.shippingAddress?.name}, {order.shippingAddress?.city}, {order.shippingAddress?.country}
                            {order.paymentRef && <> · Ref: {order.paymentRef}</>}
                            {order.invoiceNumber && <> · Fatura: {order.invoiceNumber}</>}
                          </div>

                          {/* Refund reason shown in expanded row */}
                          {order.refundReason && (
                            <div className="mt-3 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-3 py-2">
                              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Müşterinin İade Nedeni:</p>
                              <p className="text-sm text-amber-800 dark:text-amber-200 italic">"{order.refundReason}"</p>
                              {order.refundRequestedAt && (
                                <p className="text-xs text-amber-500 mt-1">
                                  {new Date(order.refundRequestedAt).toLocaleString('tr-TR')}
                                </p>
                              )}
                            </div>
                          )}

                          {order.refundNote && order.status !== 'REFUND_REQUESTED' && (
                            <div className="mt-3 rounded-lg bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-3 py-2">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Admin Notu:</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{order.refundNote}"</p>
                            </div>
                          )}

                          {/* Depot arrival row (for REFUND_REQUESTED orders with a return shipment) */}
                          {order.status === 'REFUND_REQUESTED' && (
                            <DepotArrivalRow orderId={order.id} />
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {/* REFUND_REQUESTED → dedicated review button */}
                            {order.status === 'REFUND_REQUESTED' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setRefundModal(order); }}
                                className="text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                ↩️ İade Talebini İncele
                              </button>
                            )}

                            {/* CONFIRMED → create shipment */}
                            {order.status === 'CONFIRMED' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setShipmentModal(order); }}
                                className="text-sm bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                🚚 Kargo Oluştur
                              </button>
                            )}

                            {!['CANCELLED', 'REFUNDED', 'REFUND_REQUESTED'].includes(order.status) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openAction(order, 'cancel'); }}
                                className="text-xs bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/60 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg"
                              >
                                {t('adminOrder.cancel')}
                              </button>
                            )}
                            {/* Legacy "Refund" button removed — refunds must now go through the
                                customer-requested workflow (REFUND_REQUESTED status + RefundReviewModal).
                                If admin needs to force a refund, they cancel the order with restock. */}
                          </div>
                        </td>
                      </tr>
                    )}
                </tbody>
              ))}
            </table>
          </div>

          <div className="flex items-center gap-3 justify-end text-sm">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.prev')}</button>
            <span className="text-gray-500 dark:text-gray-400">{t('admin.page')} {page}</span>
            <button disabled={(data?.items.length ?? 0) < 20} onClick={() => setPage(p => p + 1)} className="btn-ghost px-3 py-1 disabled:opacity-40">{t('admin.next')}</button>
          </div>
        </>
      )}

      {/* ── Cancel order modal (refunds go through RefundReviewModal below) ───── */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t('adminOrder.cancel')} —
              <span className="font-mono text-xs ml-2">{actionModal.order.id.slice(0, 8)}…</span>
            </h3>
            {actionError && <p className="text-red-600 dark:text-red-400 text-sm">{actionError}</p>}
            <div>
              <label className="label">{t('adminOrder.reason')}</label>
              <textarea value={actionReason} onChange={e => setActionReason(e.target.value)} className="input min-h-[60px]" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={actionRestock} onChange={e => setActionRestock(e.target.checked)} className="h-4 w-4 accent-purple-600" />
              {t('adminOrder.restock')}
            </label>
            <div className="flex gap-3">
              <button onClick={runAction} disabled={cancel.isPending} className="flex-1 btn-primary">
                {cancel.isPending ? t('adminOrder.processing') : t('adminOrder.cancel')}
              </button>
              <button onClick={() => setActionModal(null)} className="flex-1 btn-ghost">{t('adminOrder.close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Refund review modal ──────────────────────────────────────────────── */}
      {refundModal && (
        <RefundReviewModal order={refundModal} onClose={() => setRefundModal(null)} />
      )}

      {/* ── Create shipment modal ─────────────────────────────────────────────── */}
      {shipmentModal && (
        <CreateShipmentModal order={shipmentModal} onClose={() => setShipmentModal(null)} />
      )}
    </div>
  );
}
