'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useOrderDetail, useMockPay } from '../../hooks/useCart';
import { formatPrice } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { Spinner } from '../../components/ui/Spinner';
import { ProductImage } from '../../components/ui/ProductImage';

// ── Card number formatter ──────────────────────────────────────────────────────
function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

type Step = 'form' | 'secure' | 'success' | 'failed';

export default function PaymentPage() {
  const router       = useRouter();
  const params       = useSearchParams();
  const orderId      = params.get('orderId') ?? '';
  const mockPay      = useMockPay();
  const { data: order, isLoading: orderLoading } = useOrderDetail(orderId);
  const t = useI18n((s) => s.t);

  const [step,     setStep]     = useState<Step>('form');
  const [error,    setError]    = useState('');
  const [cardNum,  setCardNum]  = useState('');
  const [holder,   setHolder]   = useState('');
  const [expiry,   setExpiry]   = useState('');
  const [cvv,      setCvv]      = useState('');
  const [secProg,  setSecProg]  = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-500">{t('payment.invalidSession')}</p>
          <Link href="/checkout" className="btn-primary text-sm">{t('payment.backToCart')}</Link>
        </div>
      </div>
    );
  }

  // ── Simulate 3-D Secure then call backend ────────────────────────────────────
  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const raw = cardNum.replace(/\s/g, '');
    if (raw.length < 16) { setError(t('payment.invalidCardNumber')); return; }
    if (expiry.length < 5) { setError(t('payment.expiryMissing')); return; }
    if (cvv.length < 3) { setError(t('payment.cvvMissing')); return; }

    // Step 1: show 3D-Secure spinner
    setStep('secure');
    setSecProg(0);

    // Animate progress bar
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 18 + 4;
      setSecProg(Math.min(p, 90));
      if (p >= 90) clearInterval(interval);
    }, 250);

    // Artificial delay 2s → call backend
    timerRef.current = setTimeout(async () => {
      clearInterval(interval);
      try {
        const result = await mockPay.mutateAsync(orderId);
        setSecProg(100);
        timerRef.current = setTimeout(() => {
          router.push(
            `/order-confirmation/${result.orderId}?invoice=${result.invoiceNumber ?? ''}`
          );
        }, 600);
      } catch (err: any) {
        setStep('failed');
        setError(err?.response?.data?.message ?? t('payment.failed'));
      }
    }, 2200);
  }

  // ── Render: 3D Secure ───────────────────────────────────────────────────────
  if (step === 'secure') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-10 max-w-sm w-full text-center space-y-6">
          {/* Bank logo placeholder */}
          <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
            <span className="text-white font-bold text-xl">🏦</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('payment.secure3DTitle')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment.secure3DSubtitle')}</p>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${secProg}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{t('payment.dontClose')}</p>
        </div>
      </div>
    );
  }

  // ── Render: Failed ──────────────────────────────────────────────────────────
  if (step === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-10 max-w-sm w-full text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span className="text-3xl">✕</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('payment.failedTitle')}</h2>
            <p className="text-sm text-red-500">{error}</p>
          </div>
          <button onClick={() => setStep('form')} className="btn-primary w-full">
            {t('payment.tryAgain')}
          </button>
          <Link href="/cart" className="block text-sm text-gray-400 hover:text-gray-600 transition-colors">
            {t('payment.backToCart')}
          </Link>
        </div>
      </div>
    );
  }

  // ── Render: Payment Form ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">

      {/* Top bar — iyzico-style */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          {/* VibeHub wordmark */}
          <Link href="/" className="font-black text-xl tracking-tight bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            VibeHub
          </Link>
          {/* Secure badge */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="text-green-500">🔒</span>
            <span>{t('payment.sslBadge')}</span>
          </div>
          {/* iyzico brand */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>{t('payment.poweredBy')}</span>
            <span className="font-bold text-[#ff6c2c]">iyzico</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col lg:flex-row gap-6">

        {/* ── Left: Card form ──────────────────────────────────────────────── */}
        <div className="flex-1">

          {/* Visual card preview */}
          <div className="relative h-48 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-800 to-pink-700 p-6 mb-6 shadow-xl overflow-hidden">
            {/* Background shimmer */}
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 60%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
            <div className="relative z-10 flex flex-col h-full text-white">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium opacity-70">{t('payment.cardKind')}</span>
                <span className="text-2xl">💳</span>
              </div>
              <div className="flex-1 flex items-center">
                <span className="text-2xl font-mono tracking-widest letter-spacing-4">
                  {cardNum || '•••• •••• •••• ••••'}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs opacity-60 uppercase tracking-wider">{t('payment.cardHolder')}</p>
                  <p className="text-sm font-semibold">{holder || 'AD SOYAD'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-60 uppercase tracking-wider">{t('payment.cardExpiry')}</p>
                  <p className="text-sm font-semibold">{expiry || 'AA/YY'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Test card hint — DEV/STAGING ONLY (never shown in production) */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mb-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
              <span className="text-amber-500 shrink-0">ℹ️</span>
              <div className="text-xs text-amber-700 dark:text-amber-300">
                <p className="font-semibold mb-0.5">{t('payment.testCardTitle')}</p>
                <p>{t('payment.cardNumber')}: <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono">4242 4242 4242 4242</code></p>
                <p>{t('payment.expiryLabel')}: <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono">12/30</code> &nbsp; CVV: <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono">123</code></p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handlePay} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{t('payment.cardInfo')}</h2>

            {error && step === 'form' && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Card number */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('payment.cardNumber')}</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardNum}
                onChange={(e) => setCardNum(formatCardNumber(e.target.value))}
                className="input w-full font-mono tracking-widest"
                maxLength={19}
                required
              />
            </div>

            {/* Holder */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('payment.cardName')}</label>
              <input
                type="text"
                placeholder="AD SOYAD"
                value={holder}
                onChange={(e) => setHolder(e.target.value.toUpperCase())}
                className="input w-full"
                required
              />
            </div>

            {/* Expiry + CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('payment.expiryLabel')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="AA/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  className="input w-full font-mono"
                  maxLength={5}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('payment.cvvLabel')}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="•••"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="input w-full font-mono"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            {/* Installments */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('payment.installment')}</label>
              <select className="input w-full bg-white dark:bg-gray-900">
                <option value="1">{t('payment.installmentOnce')}</option>
                <option value="3">{t('payment.installmentN').replace('{n}', '3')}</option>
                <option value="6">{t('payment.installmentN').replace('{n}', '6')}</option>
                <option value="9">{t('payment.installmentN').replace('{n}', '9')}</option>
              </select>
            </div>

            {/* Pay button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-bold text-white text-base
                bg-gradient-to-r from-purple-600 to-pink-500
                hover:from-purple-700 hover:to-pink-600
                active:scale-95 transition-all shadow-lg shadow-purple-500/25"
            >
              {orderLoading ? <Spinner size="sm" /> : (
                <span className="flex items-center justify-center gap-2">
                  <span>🔒</span>
                  <span>
                    {t('payment.payNow')}
                    {order ? ` · ${formatPrice(order.totalAmount ?? order.total ?? 0)}` : ''}
                  </span>
                </span>
              )}
            </button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 pt-2">
              {['Visa', 'Mastercard', 'Amex', 'Troy'].map(brand => (
                <span key={brand} className="text-[10px] font-bold text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">
                  {brand}
                </span>
              ))}
            </div>
          </form>

          {/* Back link */}
          <div className="mt-4 text-center">
            <Link href="/checkout" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              {t('payment.backToShipping')}
            </Link>
          </div>
        </div>

        {/* ── Right: Order summary ─────────────────────────────────────────── */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 sticky top-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              {t('payment.orderSummary')}
            </h3>

            {orderLoading ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : order ? (
              <div className="space-y-3">
                {order.items?.map((item: any) => {
                  const imageUrl  = item.variant?.product?.images?.[0] ?? item.product?.images?.[0];
                  const title     = item.variant?.product?.title ?? item.product?.title ?? t('profileOrders.product');
                  const variant   = item.variant?.label ?? item.variant?.sku;
                  const unitPrice = Number(item.unitPriceSnapshot ?? item.unitPrice ?? item.price ?? 0);
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <ProductImage src={imageUrl} alt={title} className="w-full h-full object-cover" />
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {item.qty}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</p>
                        {variant && <p className="text-xs text-gray-400">{variant}</p>}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">
                        {formatPrice(unitPrice * item.qty)}
                      </p>
                    </div>
                  );
                })}

                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>{t('payment.subtotal')}</span>
                    <span>{formatPrice(order.totalAmount ?? order.total ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>{t('payment.shipping')}</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">{t('payment.free')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-gray-800">
                    <span>{t('payment.totalKdv')}</span>
                    <span className="text-purple-600 dark:text-purple-400">
                      {formatPrice(order.totalAmount ?? order.total ?? 0)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p className="flex items-center gap-1.5"><span>📧</span> {t('payment.confirmEmail')}</p>
                  <p className="flex items-center gap-1.5"><span>🧾</span> {t('payment.eInvoice')}</p>
                  <p className="flex items-center gap-1.5"><span>↩️</span> {t('payment.withdrawal14')}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">{t('payment.orderLoadFailed')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <footer className="mt-8 py-4 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400">
        <p>{t('payment.footer')}</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Link href="/privacy" className="hover:text-gray-600 transition-colors">{t('payment.privacy')}</Link>
          <Link href="/terms" className="hover:text-gray-600 transition-colors">{t('payment.terms')}</Link>
          <Link href="/support" className="hover:text-gray-600 transition-colors">{t('payment.help')}</Link>
        </div>
      </footer>
    </div>
  );
}
