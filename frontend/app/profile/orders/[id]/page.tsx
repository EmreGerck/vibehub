'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useOrderDetail, useCancelOrder } from '../../../../hooks/useCart';
import { useI18n } from '../../../../lib/i18n';
import { formatPrice } from '../../../../lib/format';
import { Spinner } from '../../../../components/ui/Spinner';
import { toast } from '../../../../store/toast.store';
import { useState } from 'react';

const STEPS = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const;

const STEP_KEYS: Record<string, string> = {
  PLACED: 'order.placed',
  CONFIRMED: 'order.confirmed',
  SHIPPED: 'order.shipped',
  DELIVERED: 'order.delivered',
  CANCELLED: 'order.cancelled',
  REFUNDED: 'order.refunded',
};

function StatusTimeline({ status, t }: { status: string; t: (k: string) => string }) {
  const isCancelled = status === 'CANCELLED' || status === 'REFUNDED';
  const currentIdx = STEPS.indexOf(status as any);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 py-4">
        <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>
        <span className="text-sm font-medium text-red-600 dark:text-red-400">
          {t(STEP_KEYS[status] ?? 'order.cancelled')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
            <div className="flex flex-col items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                }`}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] mt-1 text-center whitespace-nowrap ${
                  done ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {t(STEP_KEYS[step])}
              </span>
            </div>
            {!isLast && (
              <div
                className={`flex-1 h-0.5 mx-2 mt-[-16px] ${
                  i < currentIdx ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useI18n((s) => s.t);
  const { data: order, isLoading } = useOrderDetail(id);
  const cancelOrder = useCancelOrder();
  const [showCancel, setShowCancel] = useState(false);

  function handleCancel() {
    cancelOrder.mutate(id, {
      onSuccess: () => {
        toast('success', t('profile.orderCancelled'));
        setShowCancel(false);
      },
    });
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found</p>
        <Link href="/profile/orders" className="btn-primary inline-flex mt-4">{t('profile.backToOrders')}</Link>
      </div>
    );
  }

  const addr = order.shippingAddress;
  const canCancel = order.status === 'PLACED' || order.status === 'CONFIRMED';

  return (
    <>
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

      {/* Timeline */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">{t('profile.orderTimeline')}</h3>
        <StatusTimeline status={order.status} t={t} />
      </div>

      {/* Order summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">{t('profile.orderDate')}</p>
          <p className="text-sm font-medium mt-1">
            {new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
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
                <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 overflow-hidden flex items-center justify-center">
                  {item.variant?.product?.images?.[0] ? (
                    <img src={item.variant.product.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-gray-400 dark:text-gray-600">
                      {item.variant?.product?.title?.[0] ?? '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.variant?.product?.id}`} className="text-sm font-medium text-gray-900 dark:text-white truncate block hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                    {item.variant?.product?.title ?? 'Product'}
                  </Link>
                  {attrs && <p className="text-xs text-gray-500">{attrs}</p>}
                  <p className="text-xs text-gray-500">{item.tenant?.displayName} · ×{item.qty}</p>
                  {/* Pre-order status badge + ship date */}
                  {item.isPreOrder && (
                    <PreOrderItemBadge
                      status={item.preOrderStatus}
                      shipDate={item.preOrderShipDate}
                    />
                  )}
                </div>
                <p className="text-sm font-medium">{formatPrice(Number(item.unitPriceSnapshot) * item.qty)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shipping address + Tracking */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

        {order.shipments?.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('profile.tracking')}</h3>
            <div className="space-y-3">
              {order.shipments.map((s: any) => (
                <div key={s.id} className="space-y-1">
                  <p className="text-sm">
                    <span className="text-gray-900 dark:text-white font-mono">{s.trackingNumber}</span>
                    {' '}<span className="text-gray-500">{t('profile.via')} {s.carrier}</span>
                  </p>
                  {s.estimatedDelivery && (
                    <p className="text-xs text-gray-500">
                      {t('profile.estimatedDelivery')}: {new Date(s.estimatedDelivery).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cancel button */}
      {canCancel && (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
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
              <button
                onClick={() => setShowCancel(false)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelOrder.isPending}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {cancelOrder.isPending ? '...' : t('profile.cancelOrder')}
              </button>
            </div>
          )}
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
          {t('preOrder.itemBadge.shipsAround')}{new Date(shipDate).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
