'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useI18n } from '../../lib/i18n';
import { Reveal } from '../../components/ui/Reveal';

export default function ContactPage() {
  const t = useI18n((s) => s.t);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    // Store locally until a backend contact endpoint exists
    try {
      const existing = JSON.parse(localStorage.getItem('contact_messages') || '[]');
      existing.push({ ...form, ts: Date.now() });
      localStorage.setItem('contact_messages', JSON.stringify(existing));
    } catch { /* ignore */ }
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <Reveal as="up">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-3">
              {t('contact.title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">{t('contact.desc')}</p>
          </div>
        </Reveal>

        <Reveal as="up">
          <div className="card p-8">
            {submitted ? (
              <div className="text-center py-8 space-y-4 animate-scale-in">
                <div className="text-5xl">✅</div>
                <p className="text-gray-700 dark:text-gray-300 font-medium">{t('contact.success')}</p>
                <Link href="/" className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
                  ← {t('contact.backToHome')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">{t('contact.nameLabel')}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">{t('contact.emailLabel')}</label>
                  <input
                    required
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">{t('contact.messageLabel')}</label>
                  <textarea
                    required
                    rows={5}
                    className="input resize-none"
                    placeholder={t('contact.messagePlaceholder')}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-3">
                  {t('contact.submit')}
                </button>
              </form>
            )}
          </div>
        </Reveal>

        {/* Direct email */}
        <Reveal as="up">
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p className="mb-1">{t('contact.emailDirect')}</p>
            <a
              href="mailto:info@vibehub.com.tr"
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              info@vibehub.com.tr
            </a>
          </div>
        </Reveal>
      </div>

      <Footer />
    </div>
  );
}
