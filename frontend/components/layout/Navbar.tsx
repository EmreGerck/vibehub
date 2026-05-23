'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../store/auth.store';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useVendors } from '../../hooks/useVendors';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useI18n } from '../../lib/i18n';

export function Navbar() {
  const { user } = useAuthStore();
  const { t, locale, setLocale } = useI18n();
  const { logout } = useAuth();
  const { data: cartData } = useCart(!!user);
  const totalItems = cartData?.itemCount ?? 0;
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [artistsOpen, setArtistsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const artistsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const prevTotalRef = useRef(totalItems);

  const { data: vendorsData } = useVendors({ limit: 20 });
  const vendors = vendorsData?.items ?? [];

  useEffect(() => setMounted(true), []);

  // Bump the cart badge whenever a new item lands in the cart, or when
  // a child component dispatches the `cart:bump` event.
  useEffect(() => {
    if (totalItems > prevTotalRef.current) {
      setCartPulse(true);
      const id = setTimeout(() => setCartPulse(false), 600);
      prevTotalRef.current = totalItems;
      return () => clearTimeout(id);
    }
    prevTotalRef.current = totalItems;
  }, [totalItems]);

  useEffect(() => {
    function bump() {
      setCartPulse(true);
      setTimeout(() => setCartPulse(false), 600);
    }
    window.addEventListener('cart:bump', bump);
    return () => window.removeEventListener('cart:bump', bump);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (artistsRef.current && !artistsRef.current.contains(e.target as Node)) {
        setArtistsOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dashboardHref =
    user?.role === 'GOD_USER' || user?.role === 'PLATFORM_ADMIN'
      ? '/dashboard/admin/vendors'
      : user?.role === 'VENDOR_OWNER' || user?.role === 'VENDOR_MANAGER'
        ? '/dashboard/vendor/overview'
        : null;

  return (
    <nav className="sticky top-0 z-50 border-b bg-white dark:bg-black border-gray-200 dark:border-gray-800 transition-colors">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 text-2xl font-bold tracking-tight group">
          <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-[length:200%_100%] bg-clip-text text-transparent group-hover:animate-gradient transition-all">
            VibeHub
          </span>
        </Link>

        {/* Center nav — desktop */}
        <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/shop" className="hover:text-gray-900 dark:hover:text-white transition-colors">
            {t('nav.shop')}
          </Link>

          {/* Artists dropdown */}
          <div className="relative" ref={artistsRef}>
            <button
              onClick={() => setArtistsOpen((v) => !v)}
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors underline-grow"
            >
              {t('nav.artists')}
              <span className={`inline-block transition-transform duration-200 ${artistsOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={14} />
              </span>
            </button>
            {artistsOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 py-1 origin-top animate-scale-in" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
                {vendors.length === 0 && (
                  <span className="block px-4 py-2 text-gray-400 text-xs">Loading…</span>
                )}
                {vendors.map((v, i) => (
                  <Link
                    key={v.id}
                    href={`/store/${v.slug}`}
                    onClick={() => setArtistsOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-300 hover:pl-5 transition-all duration-200 animate-fade-in-down"
                    style={{ animationDelay: `${i * 24}ms` }}
                  >
                    {v.displayName}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Search trigger — mobile: icon only, desktop: full bar */}
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="flex items-center gap-2 p-2 rounded-lg sm:rounded-xl sm:border sm:px-3 sm:py-1.5 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 sm:hover:border-gray-400 sm:dark:hover:border-gray-500 transition-colors text-sm"
          >
            <SearchNavIcon />
            <span className="hidden sm:inline">{t('nav.search')}</span>
            <kbd className="hidden sm:inline text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>

          {/* Language toggle */}
          <button
            onClick={() => setLocale(locale === 'tr' ? 'en' : 'tr')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={locale === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç'}
          >
            {locale === 'tr' ? 'TR' : 'EN'}
          </button>

          <ThemeToggle />

          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 group"
          >
            <span className={`inline-block transition-transform duration-200 ${cartPulse ? 'animate-cart-bump' : 'group-hover:scale-110 group-hover:-rotate-6'}`}>
              <CartIcon />
            </span>
            {mounted && totalItems > 0 && (
              <span
                key={totalItems}
                className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white animate-pop ${cartPulse ? 'animate-cart-bump' : ''}`}
              >
                {totalItems}
              </span>
            )}
          </Link>

          {mounted && (
            user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserOpen((v) => !v)}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50 hover:scale-105 active:scale-95 transition-all duration-200 ring-0 hover:ring-2 ring-purple-400/40"
                >
                  {user.email?.[0]?.toUpperCase() ?? '?'}
                </button>
                {userOpen && (
                  <div className="absolute top-full right-0 mt-2 w-52 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 py-1 origin-top-right animate-scale-in overflow-hidden" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
                    <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 mb-1 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                      <p className="text-[10px] uppercase font-semibold text-purple-500 dark:text-purple-400 tracking-wider">Signed in</p>
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate mt-0.5">{user.email}</p>
                    </div>
                    {!dashboardHref && (
                      <Link
                        href="/profile"
                        onClick={() => setUserOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-300 hover:pl-5 transition-all duration-200 animate-fade-in-down"
                      >
                        {t('nav.profile')}
                      </Link>
                    )}
                    {dashboardHref && (
                      <Link
                        href={dashboardHref}
                        onClick={() => setUserOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-300 hover:pl-5 transition-all duration-200 animate-fade-in-down"
                      >
                        {t('nav.dashboard')}
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setUserOpen(false);
                        logout.mutate();
                      }}
                      className="w-full text-left block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:pl-5 transition-all duration-200 animate-fade-in-down delay-75"
                    >
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="btn-ghost text-sm py-1.5 px-3">
                  {t('nav.login')}
                </Link>
              </div>
            )
          )}

          {/* Hamburger — mobile */}
          <button
            className="sm:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 rounded-lg active:scale-95 transition-all"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className={`inline-block transition-transform duration-300 ${mobileOpen ? 'rotate-90' : ''}`}>
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-4 py-3 space-y-1 origin-top animate-slide-down">
          <Link href="/shop" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 hover:pl-2 transition-all animate-fade-in-down">{t('nav.shop')}</Link>
          {vendors.map((v, i) => (
            <Link
              key={v.id}
              href={`/store/${v.slug}`}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 hover:pl-2 transition-all animate-fade-in-down"
              style={{ animationDelay: `${(i + 1) * 30}ms` }}
            >
              {v.displayName}
            </Link>
          ))}
          {user ? (
            <>
              {!dashboardHref && (
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm text-purple-600 dark:text-purple-400 font-medium hover:pl-2 transition-all">{t('nav.profile')}</Link>
              )}
              {dashboardHref && (
                <Link href={dashboardHref} onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm text-purple-600 dark:text-purple-400 font-medium hover:pl-2 transition-all">{t('nav.dashboard')}</Link>
              )}
              <button onClick={() => { logout.mutate(); setMobileOpen(false); }} className="block w-full text-left py-2.5 text-sm text-red-500 dark:text-red-400 hover:pl-2 transition-all">
                {t('nav.signOut')}
              </button>
            </>
          ) : (
            <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm text-purple-600 dark:text-purple-400 font-medium hover:pl-2 transition-all">{t('nav.login')}</Link>
          )}
        </div>
      )}
    </nav>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}

function ChevronDown({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SearchNavIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
