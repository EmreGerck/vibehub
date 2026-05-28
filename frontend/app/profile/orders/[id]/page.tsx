'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  useOrderDetail,
  useCancelOrder,
  useRequestRefund,
  useTrackShipment,
  useOrderReturnShipment,
  useAddToCart,
} from '../../../../hooks/useCart';
import { useI18n } from '../../../../lib/i18n';
import { formatPrice } from '../../../../lib/format';
import { Spinner } from '../../../../components/ui/Spinner';
import { toast } from '../../../../store/toast.store';
import { useState } from 'react';
import { OrderTimeline, type OrderTimelineStatus } from '../../../../components/order/OrderTimeline';
import { ReturnTimeline, type ReturnTimelineStatus } from '../../../../components/order/ReturnTimeline';

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

// ── Return shipment status icon/color (label resolved via i18n keys) ──────────
const RETURN_STATUS_META: Record<string, { i18nKey: string; icon: string; color: string }> = {
  INITIATED:        { i18nKey: 'returnStatus.INITIATED',        icon: '📦', color: 'text-blue-600 dark:text-blue-400' },
  DROPPED_OFF:      { i18nKey: 'returnStatus.DROPPED_OFF',      icon: '🚚', color: 'text-purple-600 dark:text-purple-400' },
  IN_TRANSIT:       { i18nKey: 'returnStatus.IN_TRANSIT',       icon: '🔄', color: 'text-yellow-600 dark:text-yellow-400' },
  ARRIVED_AT_DEPOT: { i18nKey: 'returnStatus.ARRIVED_AT_DEPOT', icon: '🏭', color: 'text-orange-600 dark:text-orange-400' },
  COMPLETED:        { i18nKey: 'returnStatus.COMPLETED',        icon: '✅', color: 'text-green-600 dark:text-green-400' },
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
  const t = useI18n((s) => s.t);
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
              {t('profileOrders.estimated')}: {new Date(estimatedDelivery).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Toggle events */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
      >
        {expanded ? '▲' : '▼'} {t('profileOrders.shipmentMovements')} {events.length > 0 ? `(${events.length})` : ''}
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
          <p className="text-xs text-gray-400 dark:text-gray-500 py-2">{t('profileOrders.noMovements')}</p>
        )
      )}
    </div>
  );
}

// ── Return shipment banner — full Hepsiburada-style flow ─────────────────────
function ReturnShipmentBanner({ orderId }: { orderId: string }) {
  const { data: rs, isLoading } = useOrderReturnShipment(orderId, true);
  const t = useI18n((s) => s.t);
  const [faqOpen, setFaqOpen] = useState(false);

  if (isLoading || !rs) return null;

  const carrierLabel = CARRIER_LABELS[rs.carrier] ?? rs.carrier;
  const mapsQuery = encodeURIComponent(`${carrierLabel} şubesi`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const carrierFindLabel = t('refundFlow.findCarrierBranch').replace('{{carrier}}', carrierLabel);

  return (
    <div className="border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-amber-50 dark:bg-amber-900/20 px-5 py-3 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
        <span className="text-lg">📦</span>
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('profileOrders.returnProcessTitle')}</h3>
      </div>

      <div className="p-5 space-y-5">
        {/* Return timeline */}
        <ReturnTimeline
          status={rs.status as ReturnTimelineStatus}
          timestamps={{
            initiatedAt: rs.createdAt,
            droppedOffAt: rs.droppedOffAt,
            arrivedAtDepotAt: rs.arrivedAtDepotAt,
            completedAt: rs.status === 'COMPLETED' ? rs.updatedAt : null,
          }}
        />

        {/* Barcode card — prominent when still actionable */}
        {(rs.status === 'INITIATED' || rs.status === 'DROPPED_OFF') ? (
          <div className="rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-400/30 dark:border-purple-600/40 p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="text-5xl select-none">🏷️</div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
                {t('profileOrders.returnBarcodeTitle')}
              </p>
              <p className="text-2xl font-mono font-bold tracking-widest text-gray-900 dark:text-white select-all">
                {rs.returnBarcode}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('profileOrders.returnBarcodeHint').replace('{carrier}', carrierLabel)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
                >
                  📍 {carrierFindLabel}
                </a>
                <button
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(rs.returnBarcode);
                      toast('success', t('orderDetail.copied'));
                    } catch { /* fallback: select-all on click already works */ }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-500 dark:hover:border-gray-500 transition-colors"
                >
                  📋 {t('orderDetail.copy')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-1">
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{t('profileOrders.barcode')}:</span>
            <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">{rs.returnBarcode}</span>
          </div>
        )}

        {/* Instructions — only for very early stages */}
        {rs.status === 'INITIATED' && (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <p className="font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">{t('profileOrders.howToUse')}</p>
            <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
              <li>{t('profileOrders.howToUse1')}</li>
              <li>{t('profileOrders.howToUse2').replace('{carrier}', carrierLabel)}</li>
              <li>{t('profileOrders.howToUse3')}</li>
              <li>{t('profileOrders.howToUse4')}</li>
              <li>{t('profileOrders.howToUse5')}</li>
            </ol>
          </div>
        )}

        {/* Depot arrived state */}
        {rs.status === 'ARRIVED_AT_DEPOT' && (
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-4 py-3 text-sm text-orange-700 dark:text-orange-300">
            🏭 {t('refundFlow.depotArrivedHelp')}
          </div>
        )}

        {rs.arrivedAtDepotAt && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t('profileOrders.depotArrivedAt')}: {new Date(rs.arrivedAtDepotAt).toLocaleString('tr-TR')}
          </p>
        )}

        {/* FAQ accordion */}
        <div className="border-t border-amber-200 dark:border-amber-800/60 pt-4">
          <button
            onClick={() => setFaqOpen(!faqOpen)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            <span>❓ {t('refundFlow.faqTitle')}</span>
            <span className="text-xs">{faqOpen ? '▲' : '▼'}</span>
          </button>
          {faqOpen && (
            <div className="mt-3 space-y-3 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{t('refundFlow.faqHowLong')}</p>
                <p className="mt-0.5">{t('refundFlow.faqHowLongAnswer')}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{t('refundFlow.faqMoneyBack')}</p>
                <p className="mt-0.5">{t('refundFlow.faqMoneyBackAnswer')}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{t('refundFlow.faqShipping')}</p>
                <p className="mt-0.5">{t('refundFlow.faqShippingAnswer')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useI18n((s) => s.t);
  const { data: order, isLoading } = useOrderDetail(id);
  const cancelOrder   = useCancelOrder();
  const requestRefund = useRequestRefund();
  const addToCart     = useAddToCart();

  const [showCancel,   setShowCancel]   = useState(false);
  const [showRefund,   setShowRefund]   = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundDone,   setRefundDone]   = useState(false);
  const [reorderBusy,  setReorderBusy]  = useState(false);

  async function handleReorder() {
    if (!order?.items?.length) return;
    setReorderBusy(true);
    let added = 0;
    for (const item of order.items) {
      try {
        await addToCart.mutateAsync({ variantId: item.variantId, qty: item.qty });
        added++;
      } catch { /* skip variants that are out-of-stock or deleted */ }
    }
    setReorderBusy(false);
    if (added > 0) {
      toast('success', `${t('orderDetail.reorderAdded')} (${added}/${order.items.length})`);
      router.push('/cart');
    } else {
      toast('error', t('profileOrders.reorderFailed'));
    }
  }

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
      toast('error', t('profileOrders.refundReasonRequired'));
      return;
    }
    requestRefund.mutate({ orderId: id, reason: refundReason }, {
      onSuccess: () => {
        setRefundDone(true);
        setShowRefund(false);
        toast('success', t('profileOrders.refundSubmitOk'));
      },
      onError: (err: any) => {
        toast('error', err?.response?.data?.message ?? t('profileOrders.refundSubmitErr'));
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
  const canReorder = ['DELIVERED', 'REFUNDED', 'CANCELLED'].includes(order.status);
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
              <p className="font-semibold text-amber-800 dark:text-amber-300">{t('profileOrders.refundPendingTitle')}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                {t('profileOrders.refundPendingDesc')}
              </p>
              {order.refundReason && (
                <div className="mt-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg px-3 py-2">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-0.5">{t('profileOrders.refundPendingReasonLabel')}:</p>
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
              <p className="font-semibold text-blue-800 dark:text-blue-300">{t('profileOrders.refundCompletedTitle')}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                {t('profileOrders.refundCompletedDesc').replace('{amount}', formatPrice(order.totalAmount))}
              </p>
              {order.refundNote && (
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 italic">{t('profileOrders.refundNote')}: {order.refundNote}</p>
              )}
              {order.refundedAt && (
                <p className="text-xs text-blue-400 mt-1">
                  {t('profileOrders.refundedAt')}: {new Date(order.refundedAt).toLocaleDateString('tr-TR')}
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
              {t('profileOrders.refundSubmitted')}
            </p>
          </div>
        </div>
      )}

      {/* ── Return shipment barcode banner ─────────────────────────────────── */}
      {showReturnBanner && <ReturnShipmentBanner orderId={id} />}

      {/* Timeline — new polished stepper with timestamps + estimated delivery */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-5">{t('profile.orderTimeline')}</h3>
        <OrderTimeline
          status={order.status as OrderTimelineStatus}
          timestamps={{
            PLACED: order.createdAt,
            CONFIRMED: order.confirmedAt ?? null,
            SHIPPED: order.shippedAt ?? order.shipments?.[0]?.createdAt ?? null,
            DELIVERED: order.deliveredAt ?? null,
            REFUND_REQUESTED: order.refundRequestedAt ?? null,
            REFUNDED: order.refundedAt ?? null,
          }}
          estimatedDelivery={order.shipments?.[0]?.estimatedDelivery ?? null}
        />
        {/* Contextual single-line status sub-message */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          {order.status === 'PLACED' && t('orderDetail.placedAwaitingPayment')}
          {order.status === 'CONFIRMED' && t('orderDetail.confirmedAwaitingShipment')}
          {order.status === 'SHIPPED' && t('orderDetail.shippedOnWay')}
          {order.status === 'DELIVERED' && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              🎉 {t('orderDetail.deliveredCelebration')}
            </span>
          )}
        </p>
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

      {/* "Tekrar Sipariş Ver" — for terminal-state orders, re-fills cart with same items */}
      {canReorder && (
        <div className="mt-3 border border-purple-200 dark:border-purple-800/60 rounded-xl p-4 bg-purple-50/40 dark:bg-purple-900/10 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">🛒 {t('orderDetail.reorder')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t('profileOrders.reorderHint').replace('{n}', String(order.items?.length ?? 0))}
            </p>
          </div>
          <button
            onClick={handleReorder}
            disabled={reorderBusy}
            className="btn-primary text-sm px-4 py-2 whitespace-nowrap disabled:opacity-50"
          >
            {reorderBusy ? '...' : t('orderDetail.reorder')}
          </button>
        </div>
      )}

      {/* Refund request button + form with reason templates */}
      {canRefund && !refundDone && (
        <RefundRequestPanel
          isOpen={showRefund}
          onOpen={() => setShowRefund(true)}
          onCancel={() => { setShowRefund(false); setRefundReason(''); }}
          reason={refundReason}
          setReason={setRefundReason}
          onSubmit={handleRefundSubmit}
          isPending={requestRefund.isPending}
        />
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

// ── Refund request panel with reason templates + legal note ───────────────────
function RefundRequestPanel({
  isOpen,
  onOpen,
  onCancel,
  reason,
  setReason,
  onSubmit,
  isPending,
}: {
  isOpen: boolean;
  onOpen: () => void;
  onCancel: () => void;
  reason: string;
  setReason: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const t = useI18n((s) => s.t);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templates: { key: string; label: string }[] = [
    { key: 'sizeMismatch', label: t('refundForm.reasonSizeMismatch') },
    { key: 'qualityIssue', label: t('refundForm.reasonQualityIssue') },
    { key: 'wrongItem',    label: t('refundForm.reasonWrongItem') },
    { key: 'damaged',      label: t('refundForm.reasonDamaged') },
    { key: 'changedMind',  label: t('refundForm.reasonChangedMind') },
  ];

  function applyTemplate(key: string, label: string) {
    setSelectedTemplate(key);
    // Pre-fill with template; user can edit/extend
    if (!reason.includes(label)) {
      setReason(label + (reason ? ` — ${reason}` : ''));
    }
  }

  return (
    <div className="border border-amber-200 dark:border-amber-800/60 rounded-xl p-5 bg-amber-50/50 dark:bg-amber-900/10">
      {!isOpen ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('refundForm.title')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t('profileOrders.withdrawal14Note')}
            </p>
          </div>
          <button
            onClick={onOpen}
            className="ml-4 shrink-0 px-4 py-2 text-sm font-medium rounded-lg border border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            {t('profileOrders.refundCta')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('refundForm.reasonLabel')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('profileOrders.refundReasonInline')}
            </p>
          </div>

          {/* Reason templates */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('refundForm.reasonTemplates')}</p>
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => applyTemplate(tpl.key, tpl.label)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedTemplate === tpl.key
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-amber-400 dark:hover:border-amber-600'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={t('refundForm.reasonPlaceholder')}
            className="input w-full h-28 resize-none text-sm"
            maxLength={1000}
          />
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{reason.length}/1000</span>
            <span>* {t('refundForm.minChars')}</span>
          </div>

          {/* 14-day legal note */}
          <div className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('profileOrders.refundLegal')}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('refundForm.cancel')}
            </button>
            <button
              onClick={onSubmit}
              disabled={isPending || reason.trim().length < 10}
              className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> {t('refundForm.submitting')}</span>
              ) : `↩️ ${t('refundForm.submit')}`}
            </button>
          </div>
        </div>
      )}
    </div>
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
