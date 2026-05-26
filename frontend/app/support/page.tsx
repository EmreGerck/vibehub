'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useI18n } from '../../lib/i18n';

const FAQ_KEYS = ['faq1', 'faq2', 'faq3', 'faq4', 'faq5'] as const;

function FaqItem({ questionKey, answerKey }: { questionKey: string; answerKey: string }) {
  const [open, setOpen] = useState(false);
  const t = useI18n((s) => s.t);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden transition-colors">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
      >
        <span>{t(questionKey)}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed animate-fade-in-down">
          {t(answerKey)}
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  const t = useI18n((s) => s.t);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {t('support.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {t('support.subtitle')}
          </p>
        </div>

        {/* Contact card */}
        <div className="card p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {t('support.contactTitle')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {t('support.contactDesc')}
            </p>
            <a
              href="mailto:info@vibehub.com.tr"
              className="text-purple-600 dark:text-purple-400 font-medium text-sm hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              info@vibehub.com.tr
            </a>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('support.faqTitle')}
          </h2>
          <div className="space-y-3">
            {FAQ_KEYS.map((key) => (
              <FaqItem
                key={key}
                questionKey={`support.${key}q`}
                answerKey={`support.${key}a`}
              />
            ))}
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
          >
            &larr; {t('support.backToHome')}
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
