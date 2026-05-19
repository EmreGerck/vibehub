'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthStore } from '../../../store/auth.store';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { Spinner } from '../../../components/ui/Spinner';
import { useI18n } from '../../../lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginMfa } = useAuth();
  const { user, _hasHydrated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [useMfa, setUseMfa] = useState(true);
  const t = useI18n((s) => s.t);

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    if (user.role === 'GOD_USER' || user.role === 'PLATFORM_ADMIN') {
      router.replace('/dashboard/admin/vendors');
    } else if (user.role === 'VENDOR_OWNER' || user.role === 'VENDOR_MANAGER') {
      router.replace('/dashboard/vendor/overview');
    } else {
      router.replace('/');
    }
  }, [user, _hasHydrated, router]);

  function routeToRole(role: string) {
    if (role === 'GOD_USER' || role === 'PLATFORM_ADMIN') router.push('/dashboard/admin/vendors');
    else if (role === 'VENDOR_OWNER' || role === 'VENDOR_MANAGER') router.push('/dashboard/vendor/overview');
    else router.push('/');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (useMfa) {
        let deviceToken: string | undefined;
        try { deviceToken = localStorage.getItem('device_token') ?? undefined; } catch {}
        const data = await loginMfa.mutateAsync({ email, password, deviceToken });
        if (data.trusted) {
          routeToRole(data.user.role);
          return;
        }
        sessionStorage.setItem('mfa_challenge', data.challenge);
        sessionStorage.setItem('mfa_email', data.email);
        sessionStorage.setItem('mfa_cooldown', String(data.cooldownUntil));
        router.push('/auth/verify');
      } else {
        const data = await login.mutateAsync({ email, password });
        routeToRole(data.user.role);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials');
    }
  }

  const isPending = login.isPending || loginMfa.isPending;

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
                <Alert type="error" message={error} />
              </div>
            )}

            <Input
              label={t('auth.email')}
              type="email"
              placeholder="you@example.com"
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

            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <input
                type="checkbox"
                className="sr-only"
                checked={useMfa}
                onChange={(e) => setUseMfa(e.target.checked)}
              />
              <span className={`relative h-5 w-9 rounded-full transition-colors duration-300 ${useMfa ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 ${useMfa ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                Extra security: verify with email code
              </span>
            </label>

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
