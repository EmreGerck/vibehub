'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/auth.store';
import { Navbar } from '../../components/layout/Navbar';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../lib/i18n';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, _hasHydrated } = useAuthStore();
  const { logout } = useAuth();
  const t = useI18n((s) => s.t);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const NAV = [
    { href: '/profile/orders', label: t('profile.myOrders'), icon: '📦' },
    { href: '/profile/wishlist', label: t('profile.wishlist'), icon: '❤️' },
    { href: '/profile/social', label: t('profile.socialProfile'), icon: '👤' },
    { href: '/profile/visitors', label: t('profile.whoVisited'), icon: '👁' },
    { href: '/profile/messages', label: t('profile.messages'), icon: '💬' },
    { href: '/profile/settings', label: t('profile.accountSettings'), icon: '⚙️' },
    { href: '/profile/password', label: t('profile.changePassword'), icon: '🔒' },
  ];

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) {
      router.replace('/auth/login');
    }
  }, [user, _hasHydrated, router]);

  if (!_hasHydrated || !mounted || !user) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center py-32"><Spinner size="lg" /></div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />
      
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">{t('profile.myAccount')}</h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <nav className="space-y-1">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
              
              <button
                onClick={() => logout.mutate()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-4"
              >
                <span>🚪</span>
                {t('profile.signOut')}
              </button>
            </nav>
          </aside>
          
          {/* Content */}
          <main className="flex-1">
            <div className="card p-6 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
