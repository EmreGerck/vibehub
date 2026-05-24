'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/dashboard/Sidebar';
import { useAuthStore } from '../../../store/auth.store';
import { useI18n } from '../../../lib/i18n';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const t = useI18n((s) => s.t);

  const isGodUser = user?.role === 'GOD_USER';

  const NAV = [
    { href: '/dashboard/admin', label: t('admin.overview'), icon: '📊' },
    { href: '/dashboard/admin/vendors', label: t('admin.vendors'), icon: '🏪' },
    { href: '/dashboard/admin/products', label: t('admin.pendingProducts'), icon: '📦' },
    { href: '/dashboard/admin/categories', label: t('admin.categoriesNav'), icon: '🏷️' },
    { href: '/dashboard/admin/orders', label: t('admin.orders'), icon: '🧾' },
    { href: '/dashboard/admin/pre-orders', label: t('admin.preOrdersNav'), icon: '🕐' },
    { href: '/dashboard/admin/reviews', label: t('admin.reviewsNav'), icon: '⭐' },
    { href: '/dashboard/admin/payouts', label: t('admin.payoutsNav'), icon: '💸' },
    { href: '/dashboard/admin/financials', label: t('admin.financials'), icon: '📊' },
    { href: '/dashboard/admin/banners', label: t('admin.heroBanners'), icon: '🖼' },
    { href: '/dashboard/admin/events', label: t('admin.events'), icon: '🎫' },
    { href: '/dashboard/admin/nfc-tags', label: t('admin.nfcTags'), icon: '📡' },
    { href: '/dashboard/admin/media', label: t('admin.mediaManagement'), icon: '🎵' },
    { href: '/dashboard/admin/settings', label: t('admin.platformSettings'), icon: '⚙️' },
    { href: '/dashboard/admin/users', label: t('admin.users'), icon: '👤' },
    { href: '/dashboard/admin/audit-log', label: t('admin.auditLog'), icon: '🔍' },
    { href: '/dashboard/admin/mobile', label: t('admin.mobileApp'), icon: '📱' },
    ...(isGodUser ? [{ href: '/dashboard/admin/analytics', label: t('admin.analyticsNav'), icon: '📈' }] : []),
  ];

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (!['PLATFORM_ADMIN', 'GOD_USER'].includes(user.role)) {
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
      <Sidebar items={NAV} title={t('admin.title')} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0 min-w-0">{children}</main>
    </div>
  );
}
