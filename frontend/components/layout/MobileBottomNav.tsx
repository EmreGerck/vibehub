'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../../hooks/useCart';
import { useAuthStore } from '../../store/auth.store';
import { useI18n } from '../../lib/i18n';

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { data: cartData } = useCart(!!user);
  const cartCount = cartData?.itemCount ?? 0;
  const t = useI18n((s) => s.t);

  // Hide on dashboard pages
  if (pathname.startsWith('/dashboard')) return null;

  function openSearch() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  }

  const navItems = [
    { href: '/', label: t('mobileNav.home'), icon: <HomeIcon />, exact: true },
    { href: '/shop', label: t('mobileNav.shop'), icon: <ShopIcon /> },
  ];

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  const activeClass = 'text-purple-600 dark:text-purple-400';
  const inactiveClass = 'text-gray-500 dark:text-gray-400';

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 safe-area-pb">
      <div className="flex items-stretch h-16">
        {/* Home */}
        <Link href="/" className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${isActive('/', true) ? activeClass : inactiveClass}`}>
          <HomeIcon />
          <span>{t('mobileNav.home')}</span>
        </Link>

        {/* Shop */}
        <Link href="/shop" className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${isActive('/shop') ? activeClass : inactiveClass}`}>
          <ShopIcon />
          <span>{t('mobileNav.shop')}</span>
        </Link>

        {/* Search */}
        <button
          onClick={openSearch}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${inactiveClass} active:text-purple-600 dark:active:text-purple-400`}
        >
          <SearchIcon />
          <span>{t('mobileNav.search')}</span>
        </button>

        {/* Cart */}
        <Link href="/cart" className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative ${isActive('/cart') ? activeClass : inactiveClass}`}>
          <span className="relative">
            <CartIcon />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-0.5 items-center justify-center rounded-full bg-purple-600 text-[9px] font-bold text-white">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </span>
          <span>{t('mobileNav.cart')}</span>
        </Link>

        {/* Profile */}
        <Link
          href={user ? '/profile' : '/auth'}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${isActive('/profile') || isActive('/auth') ? activeClass : inactiveClass}`}
        >
          <ProfileIcon />
          <span>{t('mobileNav.profile')}</span>
        </Link>
      </div>
    </nav>
  );
}
