'use client';

import { Navbar } from '../layout/Navbar';
import { Footer } from '../layout/Footer';
import { useI18n } from '../../lib/i18n';

interface Props {
  title: string;
  subtitle?: string;
  updated?: string;          // e.g. "1 Mart 2026"
  children: React.ReactNode;
}

/**
 * Shared shell for /legal/* pages. Standardises typography, max-width,
 * "last updated" badge, and adds the standard navbar + footer.
 */
export default function LegalPageLayout({ title, subtitle, updated, children }: Props) {
  const t = useI18n((s) => s.t);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="card p-6 sm:p-10">
            <header className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
              )}
              {updated && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {t('legal.lastUpdated')}: <time>{updated}</time>
                </p>
              )}
            </header>

            <div className="legal-prose space-y-6 text-sm sm:text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
