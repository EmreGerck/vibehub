'use client';

import { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import { Reveal } from '../ui/Reveal';

export function NewsletterSection() {
  const t = useI18n((s) => s.t);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    // Store locally until a backend newsletter endpoint exists
    try {
      const existing = JSON.parse(localStorage.getItem('newsletter_subs') || '[]');
      existing.push({ email, ts: Date.now() });
      localStorage.setItem('newsletter_subs', JSON.stringify(existing));
    } catch { /* ignore */ }
    setSubmitted(true);
  }

  return (
    <Reveal as="up">
      <section className="py-10 pb-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 via-purple-800 to-pink-900 p-8 sm:p-12">
          {/* Decorative blob */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl" />

          <div className="relative max-w-xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {t('newsletter.title')}
            </h2>
            <p className="text-purple-200 text-sm sm:text-base mb-6">
              {t('newsletter.subtitle')}
            </p>

            {submitted ? (
              <div className="animate-scale-in">
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 backdrop-blur text-white font-medium">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t('newsletter.success')}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  required
                  placeholder={t('newsletter.placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-white text-purple-900 font-bold text-sm hover:bg-purple-50 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg"
                >
                  {t('newsletter.cta')}
                </button>
              </form>
            )}

            <p className="mt-4 text-xs text-purple-300/60">
              {t('newsletter.privacy')}
            </p>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
