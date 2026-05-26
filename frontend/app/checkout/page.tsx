'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '../../components/layout/Navbar';
import { useCart, usePlaceOrder } from '../../hooks/useCart';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { formatPrice } from '../../lib/format';
import { useI18n } from '../../lib/i18n';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: cart, isLoading: cartLoading } = useCart();
  const placeOrder = usePlaceOrder();
  const [error, setError] = useState('');
  const t = useI18n((s) => s.t);

  const [form, setForm] = useState({
    name: '', line1: '', line2: '', city: '',
    state: '', postalCode: '', country: 'TR', phone: '',
  });

  // Mandatory legal consents (Mesafeli Sözleşmeler Yönetmeliği m. 5)
  const [agreedPreInfo, setAgreedPreInfo] = useState(false);
  const [agreedDistanceContract, setAgreedDistanceContract] = useState(false);

  function setField(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!agreedPreInfo || !agreedDistanceContract) {
      setError(t('checkout.consent.required'));
      return;
    }
    try {
      const order = await placeOrder.mutateAsync({
        shippingAddress: {
          name: form.name, line1: form.line1,
          line2: form.line2 || undefined, city: form.city,
          state: form.state, postalCode: form.postalCode,
          country: form.country, phone: form.phone || undefined,
        },
      });
      // Redirect to payment page instead of confirmation
      router.push(`/payment?orderId=${order.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to place order');
    }
  }

  if (cartLoading) return (
    <>
      <Navbar />
      <div className="flex justify-center py-32"><Spinner size="lg" /></div>
    </>
  );

  if (!cart || cart.itemCount === 0) return (
    <>
      <Navbar />
      <div className="text-center py-32 space-y-4">
        <p className="text-gray-500">{t('checkout.emptyCart')}</p>
        <Link href="/shop" className="btn-primary inline-flex">{t('checkout.goToShop')}</Link>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold mb-6">{t('checkout.title')}</h1>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white text-xs font-bold">1</span>
            {t('checkout.shipping')}
          </span>
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
          <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold">2</span>
            {t('checkout.payment')}
          </span>
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
          <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold">3</span>
            {t('checkout.confirmation')}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Shipping form */}
          <form onSubmit={handleSubmit} className="flex-1 space-y-5">
            <div className="card p-5">
              <h2 className="font-semibold mb-4">{t('checkout.shippingAddress')}</h2>
              {error && <div className="mb-4"><Alert type="error" message={error} /></div>}

              <div className="space-y-4">
                <Input label={t('checkout.fullName')} value={form.name} onChange={setField('name')} required />
                <Input label={t('checkout.addressLine1')} value={form.line1} onChange={setField('line1')} required />
                <Input label={t('checkout.addressLine2')} value={form.line2} onChange={setField('line2')} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label={t('checkout.city')} value={form.city} onChange={setField('city')} required />
                  <Input label={t('checkout.state')} value={form.state} onChange={setField('state')} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label={t('checkout.postalCode')} value={form.postalCode} onChange={setField('postalCode')} required />
                  <Input label={t('checkout.country')} value={form.country} onChange={setField('country')} required />
                </div>
                <Input label={t('checkout.phone')} value={form.phone} onChange={setField('phone')} type="tel" />
              </div>
            </div>

            {/* Payment step preview */}
            <div className="card p-5">
              <h2 className="font-semibold mb-3">{t('checkout.paymentSection')}</h2>
              <div className="flex items-center gap-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-4">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-2xl">💳</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{t('checkout.iyzicoGateway')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('checkout.iyzicoDesc')}</p>
                </div>
              </div>
            </div>

            {/* ── Mandatory legal consents (Mesafeli Sözleşmeler Yönetmeliği) ── */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                {t('checkout.legalSectionTitle')}
              </p>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedPreInfo}
                  onChange={(e) => setAgreedPreInfo(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {t('checkout.consent.preInfo.before')}
                  <Link href="/legal/on-bilgilendirme" target="_blank" className="text-purple-600 dark:text-purple-400 underline font-medium">
                    {t('checkout.consent.preInfo.link')}
                  </Link>
                  {t('checkout.consent.preInfo.after')}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedDistanceContract}
                  onChange={(e) => setAgreedDistanceContract(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  {t('checkout.consent.contract.before')}
                  <Link href="/legal/mesafeli-satis" target="_blank" className="text-purple-600 dark:text-purple-400 underline font-medium">
                    {t('checkout.consent.contract.link')}
                  </Link>
                  {t('checkout.consent.contract.after')}
                </span>
              </label>

              <p className="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800 mt-3">
                {t('checkout.consent.note.before')}
                <Link href="/legal/cayma-hakki" target="_blank" className="underline">{t('checkout.consent.note.link')}</Link>
                {t('checkout.consent.note.after')}
              </p>
            </div>

            <button
              type="submit"
              disabled={placeOrder.isPending || !agreedPreInfo || !agreedDistanceContract}
              className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {placeOrder.isPending
                ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" />{t('checkout.processing')}</span>
                : <span className="flex items-center justify-center gap-2">
                    <span>💳</span>
                    <span>{t('checkout.proceedToPayment')} · {formatPrice(cart.total)}</span>
                  </span>
              }
            </button>
          </form>

          {/* Order summary */}
          <div className="lg:w-80 shrink-0">
            <div className="card p-5 space-y-4 sticky top-20">
              <h2 className="font-semibold">{t('checkout.orderSummary')}</h2>
              <div className="space-y-3">
                {cart.items.map((item) => {
                  const price = item.variant.priceOverride ?? item.variant.price;
                  return (
                    <div key={item.variantId} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 overflow-hidden flex items-center justify-center">
                        {item.product.images?.[0]
                          ? <Image src={item.product.images[0]} alt="" fill className="object-cover" sizes="48px" />
                          : <span className="text-lg font-bold text-gray-400 dark:text-gray-600">{item.product.title?.[0] ?? '?'}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.title}</p>
                        <p className="text-xs text-gray-500">×{item.qty}</p>
                      </div>
                      <p className="text-sm font-medium">{formatPrice(price * item.qty)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex justify-between font-bold">
                <span>{t('cart.total')}</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
