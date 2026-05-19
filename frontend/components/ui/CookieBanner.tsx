'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type ConsentValue = 'essential' | 'all';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cookieConsent');
    if (stored === null) {
      setVisible(true);
    }
  }, []);

  function accept(value: ConsentValue) {
    localStorage.setItem('cookieConsent', value);
    setVisible(false);
  }

  function reopenBanner() {
    localStorage.removeItem('cookieConsent');
    setVisible(true);
  }

  return (
    <>
      {/* Persistent "Cookie Preferences" trigger shown when banner is dismissed */}
      {!visible && (
        <button
          onClick={reopenBanner}
          className="fixed bottom-4 left-4 z-40 text-xs text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-200 transition-colors bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-sm"
        >
          Cookie Preferences / Çerez Tercihleri
        </button>
      )}

      {/* Banner */}
      {visible && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-gray-900 dark:bg-gray-950 border-t border-gray-700 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Text */}
            <div className="flex-1 text-sm text-gray-200">
              <p>
                <strong>Çerezler / Cookies:</strong>{' '}
                Zorunlu çerezler her zaman aktiftir. Analitik ve pazarlama çerezleri için onayınızı talep ediyoruz.{' '}
                <span className="text-gray-400">—</span>{' '}
                We always use essential cookies. We ask your consent for analytics and marketing cookies.{' '}
                <Link href="/kvkk" className="underline text-purple-400 hover:text-purple-300 transition-colors">
                  KVKK / Privacy
                </Link>
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => accept('essential')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 border border-gray-600 hover:border-gray-400 hover:text-white transition-colors"
              >
                Sadece Zorunlu / Essential Only
              </button>
              <button
                onClick={() => accept('all')}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/30"
              >
                Tümünü Kabul Et / Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
