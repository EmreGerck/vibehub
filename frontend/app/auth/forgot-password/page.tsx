'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { CodedErrorAlert } from '../../../components/ui/CodedErrorAlert';
import { Spinner } from '../../../components/ui/Spinner';
import { useI18n } from '../../../lib/i18n';
import { parseApiError, type ParsedApiError } from '../../../lib/error-codes';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ParsedApiError | string | null>(null);
  const t = useI18n((s) => s.t);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(parseApiError(err, t('common.somethingWentWrong')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">VibeHub</span>
          </Link>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">{t('auth.forgotPasswordSubtitle')}</p>
        </div>

        <div className="card p-6">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600 dark:text-green-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('auth.resetSentBody')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t('auth.resetSentSpam')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (typeof error === 'string'
                ? <Alert type="error" message={error} />
                : <CodedErrorAlert error={error} />)}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('auth.forgotPasswordHint')}
              </p>
              <Input
                label={t('auth.email')}
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? (
                  <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> {t('auth.sendingAction')}</span>
                ) : (
                  t('auth.sendResetLinkAction')
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link href="/auth/login" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
