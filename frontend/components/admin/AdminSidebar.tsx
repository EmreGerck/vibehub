'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { useI18n } from '../../lib/i18n';
import { api } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: string;
  godOnly?: boolean;
}

interface NavGroup {
  label: string;
  icon: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

// ─── Navigation structure ─────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Genel Bakış',
    icon: '📊',
    defaultOpen: true,
    items: [
      { href: '/dashboard/admin', label: 'Dashboard', icon: '🏠' },
      { href: '/dashboard/admin/analytics', label: 'Analitik', icon: '📈', godOnly: true },
    ],
  },
  {
    label: 'Satıcı Yönetimi',
    icon: '🏪',
    defaultOpen: true,
    items: [
      { href: '/dashboard/admin/vendors',    label: 'Satıcılar',      icon: '🏪' },
      { href: '/dashboard/admin/products',   label: 'Ürün Onayları',  icon: '📦' },
      { href: '/dashboard/admin/categories', label: 'Kategoriler',    icon: '🏷️' },
      { href: '/dashboard/admin/reviews',    label: 'Yorumlar',       icon: '⭐' },
      { href: '/dashboard/admin/media',      label: 'Medya',          icon: '🎵' },
    ],
  },
  {
    label: 'Sipariş & Finans',
    icon: '💰',
    defaultOpen: true,
    items: [
      { href: '/dashboard/admin/orders',     label: 'Siparişler',    icon: '🧾' },
      { href: '/dashboard/admin/pre-orders', label: 'Ön Siparişler', icon: '🕐' },
      { href: '/dashboard/admin/payouts',    label: 'Ödemeler',      icon: '💸' },
      { href: '/dashboard/admin/financials', label: 'Finansal',      icon: '📊' },
    ],
  },
  {
    label: 'İçerik & Pazarlama',
    icon: '🎨',
    defaultOpen: false,
    items: [
      { href: '/dashboard/admin/discounts', label: 'İndirimler',      icon: '🏷️' },
      { href: '/dashboard/admin/banners',  label: 'Hero Bannerlar', icon: '🖼' },
      { href: '/dashboard/admin/events',   label: 'Etkinlikler',    icon: '🎫' },
      { href: '/dashboard/admin/nfc-tags', label: 'NFC Etiketleri', icon: '📡' },
      { href: '/dashboard/admin/mobile',   label: 'Mobil Uygulama', icon: '📱' },
    ],
  },
  {
    label: 'Kullanıcılar & Güvenlik',
    icon: '🛡️',
    defaultOpen: false,
    items: [
      { href: '/dashboard/admin/users',     label: 'Kullanıcılar',       icon: '👤' },
      { href: '/dashboard/admin/security',  label: 'Güvenlik Monitörü',  icon: '🛡️' },
      { href: '/dashboard/admin/audit-log', label: 'İşlem Kaydı',        icon: '🔍' },
    ],
  },
  {
    label: 'Platform Ayarları',
    icon: '⚙️',
    defaultOpen: false,
    items: [
      { href: '/dashboard/admin/settings', label: 'Platform Ayarları', icon: '⚙️' },
    ],
  },
];

// ─── Group component ──────────────────────────────────────────────────────────

function NavGroupSection({
  group,
  isGodUser,
  pathname,
}: {
  group: NavGroup;
  isGodUser: boolean;
  pathname: string;
}) {
  const visibleItems = group.items.filter(i => !i.godOnly || isGodUser);
  if (visibleItems.length === 0) return null;

  const isAnyActive = visibleItems.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/'),
  );

  const [open, setOpen] = useState(group.defaultOpen || isAnyActive);

  // Auto-open when a child becomes active
  useEffect(() => {
    if (isAnyActive) setOpen(true);
  }, [isAnyActive]);

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{group.icon}</span>
          <span>{group.label}</span>
        </div>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Items */}
      {open && (
        <div className="mt-0.5 ml-2 space-y-0.5 border-l border-gray-100 dark:border-gray-800 pl-2">
          {visibleItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-purple-600 dark:bg-purple-700 text-white font-medium shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="text-sm shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);

  const isGodUser = user?.role === 'GOD_USER';

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch {}
    clearAuth();
    router.push('/auth/login');
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 h-14">
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="p-2 -ml-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex flex-col items-center min-w-0">
          <span className="text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">VibeHub</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400 -mt-0.5">Admin</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Backdrop */}
      {open && (
        <div aria-hidden onClick={() => setOpen(false)} className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
      )}

      <aside
        className={`
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          flex flex-col
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85%] transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:w-64 md:shrink-0 md:min-h-screen
        `}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href="/" className="text-lg font-bold">
              <span className="bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">VibeHub</span>
            </Link>
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400 mt-0.5">
              Yönetim Paneli
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user?.email}</p>
            {isGodUser && (
              <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
                ⚡ God User
              </span>
            )}
          </div>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="md:hidden p-1.5 -mr-1 -mt-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV_GROUPS.map(group => (
            <NavGroupSection
              key={group.label}
              group={group}
              isGodUser={isGodUser}
              pathname={pathname}
            />
          ))}
        </nav>

        {/* Language switcher */}
        <div className="px-4 pb-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
            {(['tr', 'en'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLocale(lang)}
                className={`flex-1 py-1.5 text-center font-medium transition-colors ${
                  locale === lang
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2 w-full text-left text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Siteye Dön
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-left text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Çıkış Yap
          </button>
        </div>
      </aside>
    </>
  );
}
