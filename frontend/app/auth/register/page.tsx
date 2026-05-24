'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { Spinner } from '../../../components/ui/Spinner';
import { useI18n } from '../../../lib/i18n';

export default function RegisterPage() {
  const router = useRouter();
  const { register, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState('');
  const t = useI18n((s) => s.t);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(t('auth.passwordsNoMatch'));
      return;
    }
    if (!termsAccepted) {
      setError(t('auth.termsRequired'));
      return;
    }
    if (!privacyAccepted) {
      setError(t('auth.privacyRequired'));
      return;
    }
    try {
      await register.mutateAsync({ email, password, termsAccepted, privacyAccepted, marketingConsent });
      // Auto-login after registration
      await login.mutateAsync({ email, password });
      router.push('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || t('auth.registrationFailed'));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">VibeHub</span>
          </Link>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">{t('auth.createCustomerAccount')}</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert type="error" message={error} />}

            <Input
              label={t('auth.email')}
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Input
              label={t('auth.password')}
              type="password"
              placeholder={t('auth.passwordMinLength')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label={t('auth.confirmPassword')}
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              error={confirm && password !== confirm ? t('auth.passwordsNoMatch') : undefined}
            />

            {/* Consent checkboxes */}
            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                  required
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('auth.termsAcceptText')}{' '}
                  <Link href="/terms" className="text-purple-600 dark:text-purple-400 hover:underline" target="_blank">{t('auth.termsLinkLabel')}</Link>
                  {' '}{t('auth.terms14day')}{' '}
                  <span className="text-red-500">*</span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                  required
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('auth.termsAcceptText')}{' '}
                  <Link href="/privacy" className="text-purple-600 dark:text-purple-400 hover:underline" target="_blank">{t('auth.privacyLinkLabel')}</Link>
                  {' '}{t('auth.and')}{' '}
                  <Link href="/kvkk" className="text-purple-600 dark:text-purple-400 hover:underline" target="_blank">{t('auth.kvkkLinkLabel')}</Link>
                  {' '}<span className="text-red-500">*</span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('auth.marketingAcceptText')}
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={register.isPending || login.isPending || !termsAccepted || !privacyAccepted}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {register.isPending || login.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" /> {t('auth.creatingAccount')}
                </span>
              ) : (
                t('auth.createAccount')
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link href="/auth/login" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors">
            {t('auth.signIn')}
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('auth.wantToSell')}{' '}
          <Link href="/vendors/apply" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors">
            {t('auth.applyVendor')}
          </Link>
        </p>
      </div>
    </div>
  );
}
