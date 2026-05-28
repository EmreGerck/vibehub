'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useMyOrders } from '../../../hooks/useCart';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { formatPrice } from '../../../lib/format';
import { useI18n } from '../../../lib/i18n';

const STATUS_BADGE: Record<string, string> = {
  PLACED:            'badge-blue',
  CONFIRMED:         'badge-purple',
  SHIPPED:           'badge-yellow',
  DELIVERED:         'badge-green',
  CANCELLED:         'badge-gray',
  REFUND_REQUESTED:  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full font-semibold',
  REFUNDED:          'badge-red',
};

const STATUS_LABEL_KEY: Record<string, string> = {
  PLACED:            'profileOrders.status.PLACED',
  CONFIRMED:         'profileOrders.status.CONFIRMED',
  SHIPPED:           'profileOrders.status.SHIPPED',
  DELIVERED:         'profileOrders.status.DELIVERED',
  CANCELLED:         'profileOrders.status.CANCELLED',
  REFUND_REQUESTED:  'profileOrders.status.REFUND_REQUESTED',
  REFUNDED:          'profileOrders.status.REFUNDED',
};

export default function ProfileOrdersPage() {
  const t = useI18n((s) => s.t);
  const params = useSearchParams();
  const justPlaced = params.get('placed');
  const { data, isLoading } = useMyOrders();

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">{t('profile.orderHistory')}</h2>

      {justPlaced && (
        <div className="mb-6">
          <Alert type="success" message={t('profile.orderPlaced')} />
        </div>
      )}

      {isLoading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

      {data && data.items.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <p className="text-gray-500">{t('profile.noOrders')}</p>
          <Link href="/" className="btn-primary inline-flex">{t('profile.startShopping')}</Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-4">
          {data.items.map((order: any) => (
            <Link key={order.id} href={`/profile/orders/${order.id}`} className="block border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-purple-400 dark:hover:border-purple-700 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 font-mono">{t('profileOrders.orderNumber')} #{order.id}</p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={STATUS_BADGE[order.status] ?? 'badge-gray'}>
                    {STATUS_LABEL_KEY[order.status] ? t(STATUS_LABEL_KEY[order.status]) : order.status}
                  </span>
                  <span className="font-bold">{formatPrice(order.totalAmount)}</span>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-800 border-t border-gray-200 dark:border-gray-800 pt-2">
                {order.items?.map((item: any) => {
                  const attrs = item.variant?.attributes
                    ? Object.values(item.variant.attributes).join(' / ')
                    : '';
                  return (
                    <div key={item.id} className="py-3 flex items-center gap-4">
                      <div className="relative h-12 w-12 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 overflow-hidden flex items-center justify-center">
                        {item.variant?.product?.images?.[0]
                          ? <Image src={item.variant.product.images[0]} alt="" fill className="object-cover" sizes="48px" />
                          : <span className="text-lg font-bold text-gray-400 dark:text-gray-600">
                              {item.variant?.product?.title?.[0] ?? '?'}
                            </span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.variant?.product?.title ?? t('profileOrders.product')}
                        </p>
                        {attrs && <p className="text-xs text-gray-500">{attrs}</p>}
                        <p className="text-xs text-gray-500">
                          {item.tenant?.displayName} · ×{item.qty}
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        {formatPrice(Number(item.unitPriceSnapshot) * item.qty)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {order.shipments?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
                  {order.shipments.map((s: any) => (
                    <p key={s.id}>
                      {t('profile.tracking')}: <span className="text-gray-900 dark:text-white font-mono">{s.trackingNumber}</span>
                      {' '}{t('profile.via')} {s.carrier}
                    </p>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
