'use client';

import Link from 'next/link';
import { useI18n } from '../../lib/i18n';

function clearCookieConsent() {
  try {
    localStorage.removeItem('cookieConsent');
    window.location.reload();
  } catch {
    // localStorage not available (SSR guard)
  }
}

export function Footer() {
  const t = useI18n((s) => s.t);
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-bold">
              <span className="bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">
                VibeHub
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('footer.shop')}</h4>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><Link href="/shop" className="hover:text-gray-900 dark:hover:text-white transition-colors">{t('footer.allProducts')}</Link></li>
              <li><Link href="/store/kalt" className="hover:text-gray-900 dark:hover:text-white transition-colors">KALT</Link></li>
              <li><Link href="/store/mode-xl" className="hover:text-gray-900 dark:hover:text-white transition-colors">MODE XL</Link></li>
              <li><Link href="/store/tekir" className="hover:text-gray-900 dark:hover:text-white transition-colors">TEKİR</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('footer.account')}</h4>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><Link href="/profile/orders" className="hover:text-gray-900 dark:hover:text-white transition-colors">{t('footer.myOrders')}</Link></li>
              <li><Link href="/profile/settings" className="hover:text-gray-900 dark:hover:text-white transition-colors">{t('footer.settings')}</Link></li>
              <li><Link href="/cart" className="hover:text-gray-900 dark:hover:text-white transition-colors">{t('footer.cart')}</Link></li>
            </ul>
          </div>

          {/* For Artists */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('footer.forArtists')}</h4>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><Link href="/vendors/apply" className="hover:text-gray-900 dark:hover:text-white transition-colors">{t('footer.sellOnVibeHub')}</Link></li>
              <li><Link href="/dashboard/vendor/overview" className="hover:text-gray-900 dark:hover:text-white transition-colors">{t('footer.vendorDashboard')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('footer.legal')}</h4>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><Link href="/legal" className="hover:text-gray-900 dark:hover:text-white transition-colors">Tüm Sözleşmeler</Link></li>
              <li><Link href="/legal/mesafeli-satis" className="hover:text-gray-900 dark:hover:text-white transition-colors">Mesafeli Satış Sözleşmesi</Link></li>
              <li><Link href="/legal/on-bilgilendirme" className="hover:text-gray-900 dark:hover:text-white transition-colors">Ön Bilgilendirme Formu</Link></li>
              <li><Link href="/legal/cayma-hakki" className="hover:text-gray-900 dark:hover:text-white transition-colors">Cayma Hakkı</Link></li>
              <li><Link href="/legal/iade-iptal" className="hover:text-gray-900 dark:hover:text-white transition-colors">İade ve İptal</Link></li>
              <li><Link href="/legal/satici-sozlesmesi" className="hover:text-gray-900 dark:hover:text-white transition-colors">Satıcı Sözleşmesi</Link></li>
              <li><Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">{t('footer.privacyPolicy')}</Link></li>
              <li><Link href="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">{t('footer.termsOfService')}</Link></li>
              <li><Link href="/kvkk" className="hover:text-gray-900 dark:hover:text-white transition-colors">{t('footer.kvkk')}</Link></li>
              <li>
                <button
                  onClick={clearCookieConsent}
                  className="hover:text-gray-900 dark:hover:text-white transition-colors text-left"
                >
                  {t('footer.cookieSettings')}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            &copy; {new Date().getFullYear()} VibeHub. {t('footer.rights')}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-600">
            <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors">{t('footer.privacy')}</Link>
            <Link href="/terms" className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors">{t('footer.terms')}</Link>
            <Link href="/kvkk" className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors">KVKK</Link>
            <Link href="/support" className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors">{t('footer.support')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
