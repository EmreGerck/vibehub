'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthStore } from '../../../store/auth.store';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { CodedErrorAlert } from '../../../components/ui/CodedErrorAlert';
import { Spinner } from '../../../components/ui/Spinner';
import { useI18n } from '../../../lib/i18n';
import { parseApiError, type ParsedApiError } from '../../../lib/error-codes';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginMfa } = useAuth();
  const { user, _hasHydrated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ParsedApiError | string | null>(null);
  const t = useI18n((s) => s.t);

  // Honor ?next=... query param so checkout-bounced users return to where they came from
  const nextPath = searchParams?.get('next') || null;

  function routeAfterAuth(role: string) {
    // If a "next" path was provided (e.g. from middleware after auth bounce), prefer it
    if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
      router.replace(nextPath);
      return;
    }
    if (role === 'GOD_USER' || role === 'PLATFORM_ADMIN') router.replace('/dashboard/admin/vendors');
    else if (role === 'VENDOR_OWNER' || role === 'VENDOR_MANAGER') router.replace('/dashboard/vendor/overview');
    else router.replace('/');
  }

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    routeAfterAuth(user.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, _hasHydrated]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      // OTP is MANDATORY for every login. Trusted devices may short-circuit the step.
      let deviceToken: string | undefined;
      try { deviceToken = localStorage.getItem('device_token') ?? undefined; } catch {}
      const data = await loginMfa.mutateAsync({ email, password, deviceToken });
      if (data.trusted) {
        // Device previously verified → no OTP needed this round
        routeAfterAuth(data.user.role);
        return;
      }
      // Hand off to /auth/verify for OTP code
      sessionStorage.setItem('mfa_challenge', data.challenge);
      sessionStorage.setItem('mfa_email', data.email);
      sessionStorage.setItem('mfa_cooldown', String(data.cooldownUntil));
      if (nextPath) sessionStorage.setItem('mfa_next', nextPath);
      router.push('/auth/verify');
    } catch (err: any) {
      setError(parseApiError(err, t('auth.invalidCredentials')));
    }
  }

  const isPending = loginMfa.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950 transition-colors relative overflow-hidden">
      {/* Decorative animated blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl animate-blob" style={{ animationDelay: '5s' }} />

      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold inline-block hover-lift">
            <span className="text-gradient-brand animate-gradient bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500">VibeHub</span>
          </Link>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">{t('auth.signInToAccount')}</p>
        </div>

        <div className="card p-6 animate-scale-in" style={{ animationDelay: '120ms' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="animate-shake">
                {typeof error === 'string'
                  ? <Alert type="error" message={error} />
                  : <CodedErrorAlert error={error} />}
              </div>
            )}

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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* OTP is mandatory — informational, not toggleable */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <span className="text-purple-600 dark:text-purple-400">🔒</span>
              <span className="text-xs text-purple-800 dark:text-purple-200">
                {t('auth.mfaRequired')}
              </span>
            </div>

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline-grow transition-colors">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" /> {t('auth.signingIn')}
                </span>
              ) : (
                t('auth.signIn')
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400 animate-fade-in delay-200">
          {t('auth.noAccount')}{' '}
          <Link href="/auth/register" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium underline-grow transition-colors">
            {t('auth.createOne')}
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400 animate-fade-in delay-300">
          {t('auth.wantToSell')}{' '}
          <Link href="/vendors/apply" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium underline-grow transition-colors">
            {t('auth.applyVendor')}
          </Link>
        </p>
      </div>
    </div>
  );
}
