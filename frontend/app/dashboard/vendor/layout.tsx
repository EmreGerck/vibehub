'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/dashboard/Sidebar';
import { useAuthStore } from '../../../store/auth.store';
import { useI18n } from '../../../lib/i18n';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const t = useI18n((s) => s.t);

  const NAV = [
    { href: '/dashboard/vendor/overview', label: t('vendor.overview'), icon: '▦' },
    { href: '/dashboard/vendor/profile', label: 'Profil & Banner', icon: '🖼' },
    { href: '/dashboard/vendor/products', label: t('vendor.products'), icon: '📦' },
    { href: '/dashboard/vendor/orders', label: t('vendor.orders'), icon: '🧾' },
    { href: '/dashboard/vendor/payouts', label: t('vendor.payouts'), icon: '💳' },
    { href: '/dashboard/vendor/events', label: t('vendor.events'), icon: '🎫' },
    { href: '/dashboard/vendor/media', label: t('vendor.media'), icon: '🎵' },
    { href: '/dashboard/vendor/analytics', label: 'Analytics', icon: '📊' },
    { href: '/dashboard/vendor/forum', label: t('vendor.forum'), icon: '💬' },
  ];

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (!['VENDOR_OWNER', 'VENDOR_MANAGER'].includes(user.role)) {
      router.replace('/');
    }
  }, [user, _hasHydrated, router]);

  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Sidebar items={NAV} title={t('vendor.title')} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0 min-w-0">{children}</main>
    </div>
  );
}
