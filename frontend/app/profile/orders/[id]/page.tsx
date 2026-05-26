'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  useOrderDetail,
  useCancelOrder,
  useRequestRefund,
  useTrackShipment,
  useOrderReturnShipment,
} from '../../../../hooks/useCart';
import { useI18n } from '../../../../lib/i18n';
import { formatPrice } from '../../../../lib/format';
import { Spinner } from '../../../../components/ui/Spinner';
import { toast } from '../../../../store/toast.store';
import { useState } from 'react';

const STEPS = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const;

const STEP_KEYS: Record<string, string> = {
  PLACED:            'order.placed',
  CONFIRMED:         'order.confirmed',
  SHIPPED:           'order.shipped',
  DELIVERED:         'order.delivered',
  CANCELLED:         'order.cancelled',
  REFUND_REQUESTED:  'order.refundRequested',
  REFUNDED:          'order.refunded',
};

const CARRIER_LABELS: Record<string, string> = {
  aras:    'Aras Kargo',
  yurtici: 'Yurtiçi Kargo',
  mock:    'Demo Kargo',
};

// ── Return shipment status labels ─────────────────────────────────────────────
const RETURN_STATUS: Record<string, { label: string; icon: string; color: string }> = {
  INITIATED:        { label: 'Kargoya Bekliyor',     icon: '📦', color: 'text-blue-600 dark:text-blue-400' },
  DROPPED_OFF:      { label: 'Kargoya Teslim Edildi', icon: '🚚', color: 'text-purple-600 dark:text-purple-400' },
  IN_TRANSIT:       { label: 'Yolda',                icon: '🔄', color: 'text-yellow-600 dark:text-yellow-400' },
  ARRIVED_AT_DEPOT: { label: 'Depoda İnceleniyor',   icon: '🏭', color: 'text-orange-600 dark:text-orange-400' },
  COMPLETED:        { label: 'Tamamlandı',           icon: '✅', color: 'text-green-600 dark:text-green-400' },
};

// ── Status timeline ────────────────────────────────────────────────────────────
function StatusTimeline({ status, t }: { status: string; t: (k: string) => string }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">✕</span>
        </div>
        <span className="text-sm font-medium text-red-600 dark:text-red-400">{t('order.cancelled')}</span>
      </div>
    );
  }

  if (status === 'REFUND_REQUESTED') {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="h-8 w-8 rounded-full bg-amber-400 dark:bg-amber-500 flex items-center justify-center shrink-0 animate-pulse">
          <span className="text-white text-sm">↩️</span>
        </div>
        <div>
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t('order.refundRequested')}</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('order.refundRequestedSub')}</p>
        </div>
      </div>
    );
  }

  if (status === 'REFUNDED') {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
          <span className="text-white text-sm">✓</span>
        </div>
        <div>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{t('order.refunded')}</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('order.refundedSub')}</p>
        </div>
      </div>
    );
  }

  const currentIdx = STEPS.indexOf(status as any);
  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
            <div className="flex flex-col items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (i + 1)}
              </div>
              <span className={`text-[10px] mt-1 text-center whitespace-nowrap ${
                done ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {t(STEP_KEYS[step])}
              </span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-16px] ${i < currentIdx ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Shipment tracker (Hepsiburada-style) ──────────────────────────────────────
function ShipmentTracker({ trackingNumber, carrier, estimatedDelivery }: {
  trackingNumber: string;
  carrier: string;
  estimatedDelivery?: string;
}) {
  const { data: tracking, isLoading } = useTrackShipment(trackingNumber, carrier);
  const carrierLabel = CARRIER_LABELS[carrier] ?? carrier;
  const [expanded, setExpanded] = useState(true);

  const statusLabel = tracking?.status ?? '—';
  const events: Array<{ date: string; location: string; description: string }> = tracking?.events ?? [];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{carrierLabel}</span>
            {tracking?.mock && (
              <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded font-mono">DEMO</span>
            )}
          </div>
          <p className="text-xs font-mono text-purple-600 dark:text-purple-400 mt-0.5">{trackingNumber}</p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
            🚚 {statusLabel}
          </span>
          {estimatedDelivery && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Tahmini: {new Date(estimatedDelivery).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Toggle events */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
      >
        {expanded ? '▲' : '▼'} Kargo Hareketleri {events.length > 0 ? `(${events.length})` : ''}
      </button>

      {expanded && (
        isLoading ? (
          <div className="flex justify-center py-4"><Spinner size="sm" /></div>
        ) : events.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-0">
              {events.map((event, i) => (
                <div key={i} className="flex gap-3 relative pb-4 last:pb-0">
                  <div className={`h-5 w-5 rounded-full border-2 shrink-0 mt-0.5 z-10 ${
                    i === 0
                      ? 'bg-purple-600 border-purple-600'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug ${
                      i === 0 ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {event.location && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          📍 {event.location}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(event.date).toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-2">Henüz kargo hareketi bulunmuyor.</p>
        )
      )}
    </div>
  );
}

// ── Return shipment banner ────────────────────────────────────────────────────
function ReturnShipmentBanner({ orderId }: { orderId: string }) {
  const { data: rs, isLoading } = useOrderReturnShipment(orderId, true);

  if (isLoading || !rs) return null;

  const info = RETURN_STATUS[rs.status] ?? RETURN_STATUS.INITIATED;
  const carrierLabel = CARRIER_LABELS[rs.carrier] ?? rs.carrier;

  return (
    <div className="border border-blue-200 dark:border-blue-800 rounded-xl overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-900/20 px-5 py-3 border-b border-blue-200 dark:border-blue-800 flex items-center gap-2">
        <span className="text-lg">📦</span>
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">İade Kargo Bilgisi</h3>
        <span className={`ml-auto text-xs font-semibold ${info.color}`}>
          {info.icon} {info.label}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Barcode */}
        {rs.status === 'INITIATED' || rs.status === 'DROPPED_OFF' ? (
          <div className="rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-400/30 dark:border-purple-600/40 p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="text-4xl select-none">🏷️</div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
                İade Kargo Kodunuz
              </p>
              <p className="text-2xl font-mono font-bold tracking-widest text-gray-900 dark:text-white">
                {rs.returnBarcode}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {carrierLabel} şubesine götürün · Personele bu kodu gösterin
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-1">
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">Barkod:</span>
            <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">{rs.returnBarcode}</span>
          </div>
        )}

        {/* Instructions */}
        {(rs.status === 'INITIATED') && (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <p className="font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Nasıl kullanılır?</p>
            <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
              <li>Ürünü hasarsız, orijinal ambalajında paketleyin.</li>
              <li>En yakın <strong>{carrierLabel}</strong> şubesine gidin.</li>
              <li>Personele yukarıdaki kodu gösterin.</li>
              <li>Paketiniz VibeHub deposuna yönlendirilecektir.</li>
              <li>Depoya ulaşınca ekibimiz inceleyip size bilgi verecektir.</li>
            </ol>
          </div>
        )}

        {rs.status === 'ARRIVED_AT_DEPOT' && (
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-4 py-3 text-sm text-orange-700 dark:text-orange-300">
            🏭 Paketiniz depoya ulaştı. Ekibimiz ürünü inceliyor — en kısa sürede bilgilendirileceksiniz.
          </div>
        )}

        {rs.arrivedAtDepotAt && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Depoya ulaşma tarihi: {new Date(rs.arrivedAtDepotAt).toLocaleString('tr-TR')}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useI18n((s) => s.t);
  const { data: order, isLoading } = useOrderDetail(id);
  const cancelOrder   = useCancelOrder();
  const requestRefund = useRequestRefund();

  const [showCancel,   setShowCancel]   = useState(false);
  const [showRefund,   setShowRefund]   = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundDone,   setRefundDone]   = useState(false);

  function handleCancel() {
    cancelOrder.mutate(id, {
      onSuccess: () => {
        toast('success', t('profile.orderCancelled'));
        setShowCancel(false);
      },
    });
  }

  function handleRefundSubmit() {
    if (!refundReason.trim()) {
      toast('error', 'Lütfen iade nedenini belirtin.');
      return;
    }
    requestRefund.mutate({ orderId: id, reason: refundReason }, {
      onSuccess: () => {
        setRefundDone(true);
        setShowRefund(false);
        toast('success', 'İade talebiniz alındı. Kargo barkod kodunuz e-posta ile gönderildi.');
      },
      onError: (err: any) => {
        toast('error', err?.response?.data?.message ?? 'İade talebi gönderilemedi.');
      },
    });
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('profile.orderNotFound')}</p>
        <Link href="/profile/orders" className="btn-primary inline-flex mt-4">{t('profile.backToOrders')}</Link>
      </div>
    );
  }

  const addr      = order.shippingAddress;
  const canCancel = order.status === 'PLACED' || order.status === 'CONFIRMED';
  const canRefund = order.status === 'DELIVERED';
  const isRefundPending = order.status === 'REFUND_REQUESTED';
  const isRefunded      = order.status === 'REFUNDED';
  const showReturnBanner = isRefundPending || isRefunded;

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile/orders" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h2 className="text-xl font-semibold">{t('profile.orderDetail')}</h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5">#{order.id}</p>
        </div>
      </div>

      {/* ── Refund status banner ────────────────────────────────────────────── */}
      {isRefundPending && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">⏳</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-800 dark:text-amber-300">İade Talebiniz İnceleniyor</p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                Ekibimiz 1-3 iş günü içinde talebinizi değerlendirip size e-posta ile bilgi verecektir.
              </p>
              {order.refundReason && (
                <div className="mt-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg px-3 py-2">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-0.5">Belirttiğiniz neden:</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 italic">"{order.refundReason}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isRefunded && (
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">✅</span>
            <div>
              <p className="font-semibold text-blue-800 dark:text-blue-300">İadeniz Tamamlandı</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                {formatPrice(order.totalAmount)} tutarındaki iade, ödeme yönteminize 5-10 iş günü içinde yansıyacaktır.
              </p>
              {order.refundNote && (
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 italic">Not: {order.refundNote}</p>
              )}
              {order.refundedAt && (
                <p className="text-xs text-blue-400 mt-1">
                  İşlem tarihi: {new Date(order.refundedAt).toLocaleDateString('tr-TR')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refund request submitted confirmation */}
      {refundDone && !isRefundPending && (
        <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📧</span>
            <p className="text-sm text-green-700 dark:text-green-300">
              İade talebiniz iletildi. İade kargo barkodunuz e-posta adresinize gönderildi.
            </p>
          </div>
        </div>
      )}

      {/* ── Return shipment barcode banner ─────────────────────────────────── */}
      {showReturnBanner && <ReturnShipmentBanner orderId={id} />}

      {/* Timeline */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">{t('profile.orderTimeline')}</h3>
        <StatusTimeline status={order.status} t={t} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">{t('profile.orderDate')}</p>
          <p className="text-sm font-medium mt-1">
            {new Date(order.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">{t('profile.orderStatus')}</p>
          <p className="text-sm font-medium mt-1">{t(STEP_KEYS[order.status] ?? 'order.placed')}</p>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">{t('profile.orderTotal')}</p>
          <p className="text-sm font-bold mt-1">{formatPrice(order.totalAmount)}</p>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">{t('profile.orderItems')}</p>
          <p className="text-sm font-medium mt-1">{order.items?.length ?? 0}</p>
        </div>
      </div>

      {/* Items */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('profile.orderItems')}</h3>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {order.items?.map((item: any) => {
            const attrs = item.variant?.attributes
              ? Object.values(item.variant.attributes).join(' / ')
              : '';
            return (
              <div key={item.id} className="py-3 flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 overflow-hidden flex items-center justify-center">
                  {item.variant?.product?.images?.[0] ? (
                    <Image src={item.variant.product.images[0]} alt="" fill className="object-cover" sizes="56px" />
                  ) : (
                    <span className="text-lg font-bold text-gray-400 dark:text-gray-600">
                      {item.variant?.product?.title?.[0] ?? '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${item.variant?.product?.id}`}
                    className="text-sm font-medium text-gray-900 dark:text-white truncate block hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    {item.variant?.product?.title ?? 'Ürün'}
                  </Link>
                  {attrs && <p className="text-xs text-gray-500">{attrs}</p>}
                  <p className="text-xs text-gray-500">{item.tenant?.displayName} · ×{item.qty}</p>
                  {item.isPreOrder && (
                    <PreOrderItemBadge status={item.preOrderStatus} shipDate={item.preOrderShipDate} />
                  )}
                </div>
                <p className="text-sm font-medium">{formatPrice(Number(item.unitPriceSnapshot) * item.qty)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Shipping + Tracking ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        {/* Shipment tracking (Hepsiburada-style) */}
        {order.shipments?.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">{t('profile.tracking')}</h3>
            <div className="space-y-6 divide-y divide-gray-200 dark:divide-gray-800">
              {order.shipments.map((s: any) => (
                <div key={s.id} className="first:pt-0 pt-6">
                  <ShipmentTracker
                    trackingNumber={s.trackingNumber}
                    carrier={s.carrier}
                    estimatedDelivery={s.estimatedDelivery}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shipping address */}
        {addr && (
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('profile.shippingAddress')}</h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <p className="font-medium">{addr.name}</p>
              <p>{addr.line1}</p>
              {addr.line2 && <p>{addr.line2}</p>}
              <p>{addr.city}, {addr.state} {addr.postalCode}</p>
              <p>{addr.country}</p>
              {addr.phone && <p className="text-gray-500">{addr.phone}</p>}
            </div>
          </div>
        )}
      </div>

      {/* ── Actions ────────────────────────────────────────────────────────── */}

      {/* Cancel */}
      {canCancel && (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-3">
          {!showCancel ? (
            <button
              onClick={() => setShowCancel(true)}
              className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
            >
              {t('profile.cancelOrder')}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">{t('profile.cancelConfirm')}</p>
              <button onClick={() => setShowCancel(false)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleCancel} disabled={cancelOrder.isPending} className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                {cancelOrder.isPending ? '...' : t('profile.cancelOrder')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Refund request button + modal */}
      {canRefund && !refundDone && (
        <div className="border border-amber-200 dark:border-amber-800/60 rounded-xl p-5 bg-amber-50/50 dark:bg-amber-900/10">
          {!showRefund ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">İade Talebi</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  14 gün içinde herhangi bir gerekçe göstermeksizin iade talep edebilirsiniz.
                </p>
              </div>
              <button
                onClick={() => setShowRefund(true)}
                className="ml-4 shrink-0 px-4 py-2 text-sm font-medium rounded-lg border border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                ↩️ İade Talebi Oluştur
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">İade nedeninizi belirtin</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Talebiniz onaylandığında size Aras Kargo iade kodu e-posta ile gönderilecektir.
                </p>
              </div>
              <textarea
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="Örnek: Ürün beden uyumsuzluğu, hasarlı teslimat, yanlış ürün..."
                className="input w-full h-28 resize-none text-sm"
                maxLength={1000}
              />
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{refundReason.length}/1000 karakter</span>
                <span>* Minimum 10 karakter giriniz</span>
              </div>
              {/* 14-day legal note */}
              <div className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  🏛️ <strong>Yasal Bilgi:</strong> 6502 Sayılı Tüketicinin Korunması Hakkında Kanun kapsamında teslimattan itibaren
                  <strong> 14 takvim günü</strong> içinde cayma hakkını kullanabilirsiniz. Onaylanan iadeler
                  <strong> 5-10 iş günü</strong> içinde orijinal ödeme yönteminize iade edilir.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRefund(false); setRefundReason(''); }}
                  className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleRefundSubmit}
                  disabled={requestRefund.isPending || refundReason.trim().length < 10}
                  className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {requestRefund.isPending ? (
                    <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Gönderiliyor…</span>
                  ) : '↩️ İade Talep Et + Kargo Kodu Al'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invoice link */}
      {(order.status === 'CONFIRMED' || order.status === 'SHIPPED' || order.status === 'DELIVERED' || isRefunded) && order.invoiceNumber && (
        <div className="mt-3 flex justify-end">
          <Link href={`/invoice/${order.id}`} className="text-xs text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1">
            🧾 e-Arşiv Fatura — {order.invoiceNumber}
          </Link>
        </div>
      )}
    </>
  );
}

// ── Pre-order line item badge ────────────────────────────────────────────────
function PreOrderItemBadge({ status, shipDate }: { status: string | null; shipDate: string | null }) {
  const t = useI18n((s) => s.t);
  const cls: Record<string, { cls: string; icon: string }> = {
    AWAITING_APPROVAL: { cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', icon: '⏳' },
    APPROVED:          { cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',    icon: '✓' },
    PRODUCTION:        { cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',        icon: '🏭' },
    SHIPPED:           { cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', icon: '🚚' },
    CANCELLED:         { cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',            icon: '✕' },
  };
  const key = status && cls[status] ? status : 'AWAITING_APPROVAL';
  const m = cls[key];
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${m.cls}`}>
        🕐 · {m.icon} {t(`preOrder.itemBadge.${key}`)}
      </span>
      {shipDate && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          {t('preOrder.itemBadge.shipsAround')}{new Date(shipDate).toLocaleDateString('tr-TR')}
        </span>
      )}
    </div>
  );
}
