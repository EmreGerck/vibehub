'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useI18n } from '../../lib/i18n';
import { Reveal } from '../../components/ui/Reveal';
import { api } from '../../lib/api';

export default function ContactPage() {
  const t = useI18n((s) => s.t);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/contact', form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
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
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
                  {loading ? 'Gönderiliyor…' : t('contact.submit')}
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
