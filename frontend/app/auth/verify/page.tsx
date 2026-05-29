'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { OtpInput } from '../../../components/auth/OtpInput';
import { Spinner } from '../../../components/ui/Spinner';
import { CodedErrorAlert } from '../../../components/ui/CodedErrorAlert';
import { useI18n } from '../../../lib/i18n';
import { toast } from '../../../store/toast.store';
import { parseApiError, type ParsedApiError } from '../../../lib/error-codes';

const OTP_LENGTH = 6;

export default function VerifyPage() {
  const router = useRouter();
  const { verifyOtp, resendOtp } = useAuth();
  const t = useI18n((s) => s.t);

  const [challenge, setChallenge] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [parsedError, setParsedError] = useState<ParsedApiError | string | null>(null);
  const [success, setSuccess] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  const submitOnceRef = useRef(false);

  // Pull challenge from session storage; redirect if missing
  useEffect(() => {
    const c = sessionStorage.getItem('mfa_challenge');
    const e = sessionStorage.getItem('mfa_email') ?? '';
    const cool = Number(sessionStorage.getItem('mfa_cooldown') ?? '0');
    if (!c) {
      router.replace('/auth/login');
      return;
    }
    setChallenge(c);
    setEmail(e);
    setCooldownUntil(cool);
  }, [router]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  async function submit(c: string) {
    if (submitOnceRef.current || !challenge) return;
    submitOnceRef.current = true;
    setError(false);
    setParsedError(null);
    try {
      const data = await verifyOtp.mutateAsync({ challenge, code: c, trustDevice });
      setSuccess(true);
      const nextPath = sessionStorage.getItem('mfa_next');
      sessionStorage.removeItem('mfa_challenge');
      sessionStorage.removeItem('mfa_email');
      sessionStorage.removeItem('mfa_cooldown');
      sessionStorage.removeItem('mfa_next');
      // brief celebratory pause
      setTimeout(() => {
        // Honor "next" path (e.g., checkout-bounce flow)
        if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
          router.push(nextPath);
          return;
        }
        const role = data.user.role;
        if (role === 'GOD_USER' || role === 'PLATFORM_ADMIN') router.push('/dashboard/admin/vendors');
        else if (role === 'VENDOR_OWNER' || role === 'VENDOR_MANAGER') router.push('/dashboard/vendor/overview');
        else router.push('/');
      }, 750);
    } catch (err: any) {
      submitOnceRef.current = false;
      setError(true);
      setParsedError(parseApiError(err, t('otp.invalid')));
      setCode('');
      setTimeout(() => setError(false), 700);
    }
  }

  async function handleResend() {
    if (!challenge || cooldownLeft > 0) return;
    try {
      const data = await resendOtp.mutateAsync({ challenge });
      setCooldownUntil(data.cooldownUntil);
      sessionStorage.setItem('mfa_cooldown', String(data.cooldownUntil));
      toast('success', t('otp.codeSent'));
    } catch (err: any) {
      const parsed = parseApiError(err, t('auth.resendError'));
      toast('error', parsed.isCoded ? `${parsed.supportMessage} (${parsed.errorCode})` : parsed.message);
    }
  }

  const maskedEmail = email
    ? email.replace(/^(.).+(.@)/, (_, a, b) => `${a}•••${b}`)
    : '';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950 transition-colors relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-pink-500/20 blur-3xl animate-blob" style={{ animationDelay: '4s' }} />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold inline-block hover-lift">
            <span className="text-gradient-brand animate-gradient bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500">VibeHub</span>
          </Link>
        </div>

        <div className="card p-7 animate-scale-in" style={{ animationDelay: '100ms' }}>
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 animate-pulse-ring">
              <ShieldIcon />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('otp.title')}</h1>
            <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
              {t('otp.subtitle')}
              {maskedEmail && <span className="block mt-0.5 font-medium text-gray-900 dark:text-white">{maskedEmail}</span>}
            </p>
          </div>

          {/* OTP input */}
          <div className="mt-7">
            <OtpInput
              length={OTP_LENGTH}
              value={code}
              onChange={setCode}
              onComplete={submit}
              error={error}
              disabled={verifyOtp.isPending || success}
            />
            <p className="text-center text-[11px] mt-3 text-gray-400 dark:text-gray-500">
              {t('otp.pasteHint')}
            </p>
          </div>

          {/* Inline error */}
          {parsedError && !success && (
            <div className="mt-3 animate-fade-in">
              {typeof parsedError === 'string'
                ? <p className="text-center text-sm text-red-500 dark:text-red-400">{parsedError}</p>
                : <CodedErrorAlert error={parsedError} />}
            </div>
          )}

          {/* Trust device */}
          <label className="flex items-center justify-center gap-2 mt-5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="sr-only"
            />
            <span className={`relative h-5 w-9 rounded-full transition-colors duration-300 ${trustDevice ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 ${trustDevice ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">{t('otp.usingDevice')}</span>
          </label>

          {/* Submit button + resend */}
          <button
            onClick={() => code.length === OTP_LENGTH && submit(code)}
            disabled={code.length !== OTP_LENGTH || verifyOtp.isPending || success}
            className="btn-primary w-full py-2.5 mt-5"
          >
            {success ? (
              <span className="flex items-center justify-center gap-2 animate-fade-in">
                <CheckCircleIcon /> {t('otp.success')}
              </span>
            ) : verifyOtp.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" /> {t('otp.verifying')}
              </span>
            ) : (
              t('otp.verify')
            )}
          </button>

          <div className="mt-4 text-center text-sm">
            {cooldownLeft > 0 ? (
              <span className="text-gray-500 dark:text-gray-400">
                {t('otp.resendIn')} <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">{cooldownLeft}{t('otp.secsLeft')}</span>
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendOtp.isPending}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium underline-grow transition-colors"
              >
                {t('otp.resend')}
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          <Link href="/auth/login" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            ← {t('auth.backToSignIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
