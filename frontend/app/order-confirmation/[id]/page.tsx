'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';
import { useOrderDetail } from '../../../hooks/useCart';
import { useI18n } from '../../../lib/i18n';
import { formatPrice } from '../../../lib/format';
import { Spinner } from '../../../components/ui/Spinner';
import { ProductImage } from '../../../components/ui/ProductImage';

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const qp     = useSearchParams();
  const { data: order, isLoading } = useOrderDetail(id);
  const invoiceNumber = qp.get('invoice') || order?.invoiceNumber || null;
  const t = useI18n((s) => s.t);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Navbar />

      <div className="flex-1 mx-auto w-full max-w-2xl px-4 py-12 sm:py-20">

        {/* Success header */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 animate-scale-in">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600 dark:text-green-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 animate-fade-in-up">
            {t('orderConfirm.thankYou')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 animate-fade-in-up">
            {t('orderConfirm.orderPlaced')}
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-600 font-mono break-all">
            {t('orderConfirm.orderId')}: #{id}
          </p>
        </div>

        {/* Order details card */}
        <div className="card p-6 mb-6 animate-fade-in-up">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : order ? (
            <>
              {/* Items */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800 mb-5">
                {order.items?.map((item: any) => {
                  const imageUrl = item.variant?.product?.images?.[0] ?? item.product?.images?.[0];
                  const title = item.variant?.product?.title ?? item.product?.title ?? 'Ürün';
                  const variantLabel = item.variant?.label ?? item.variant?.sku;
                  const unitPrice = item.unitPrice ?? item.price;
                  return (
                    <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
                        <ProductImage src={imageUrl} alt={title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-sm leading-tight">{title}</p>
                        {variantLabel && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{variantLabel}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">× {item.qty ?? item.quantity ?? 1}</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm shrink-0">
                        {formatPrice((unitPrice ?? 0) * (item.qty ?? item.quantity ?? 1))}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
                {order.shippingFee != null && order.shippingFee > 0 && (
                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>Kargo</span>
                    <span>{formatPrice(order.shippingFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                  <span>Toplam</span>
                  <span className="text-purple-600 dark:text-purple-400">
                    {formatPrice(order.totalAmount ?? order.total)}
                  </span>
                </div>
              </div>

              {/* Shipping address */}
              {order.shippingAddress && (
                <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Teslimat Adresi
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {order.shippingAddress.fullName}<br />
                    {order.shippingAddress.addressLine1}
                    {order.shippingAddress.addressLine2 && <>, {order.shippingAddress.addressLine2}</>}<br />
                    {order.shippingAddress.district && `${order.shippingAddress.district}, `}
                    {order.shippingAddress.city}
                    {order.shippingAddress.postalCode && ` ${order.shippingAddress.postalCode}`}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Sipariş detayları yükleniyor…
            </div>
          )}
        </div>

        {/* e-Fatura card */}
        <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 mb-4 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🧾</span>
            <div className="flex-1">
              <p className="font-semibold text-green-800 dark:text-green-300 text-sm">e-Arşiv Fatura Kesildi</p>
              {invoiceNumber && (
                <p className="text-xs text-green-600 dark:text-green-400 font-mono mt-0.5">
                  Fatura No: {invoiceNumber}
                </p>
              )}
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                GİB standartlarına uygun elektronik faturanız hazır.
              </p>
            </div>
            <Link
              href={`/invoice/${id}`}
              className="shrink-0 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Faturayı Gör →
            </Link>
          </div>
        </div>

        {/* Info banner */}
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 mb-8 flex gap-3 animate-fade-in-up">
          <span className="text-lg shrink-0">📧</span>
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Sipariş onayı e-posta adresinize gönderildi. Kargoya verildiğinde tekrar bildirim alacaksınız.
          </span>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up">
          <Link href="/profile/orders" className="btn-primary px-8 py-3 text-sm w-full sm:w-auto text-center">
            {t('orderConfirm.viewOrders')}
          </Link>
          <Link href="/shop" className="btn-ghost px-8 py-3 text-sm w-full sm:w-auto text-center">
            {t('orderConfirm.continueShopping')}
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
