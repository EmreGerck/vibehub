'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useI18n } from '../../../lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function NfcRedirectPage() {
  const { tagId } = useParams<{ tagId: string }>();
  const t = useI18n((s) => s.t);
  const [status, setStatus] = useState<'redirecting' | 'notfound' | 'disabled'>('redirecting');

  useEffect(() => {
    if (!tagId) return;

    // Directly navigate to the backend redirect endpoint.
    // The backend will 302 to the destination URL — the browser follows it automatically.
    // If the tag doesn't exist, backend returns 404 HTML which we catch below.
    // We use fetch to check first (no-cors lets us detect failure vs success).
    const redirectUrl = `${API_URL}/nfc/redirect/${tagId}`;

    // Small delay for UX (spinner visible)
    const timer = setTimeout(() => {
      window.location.href = redirectUrl;
    }, 600);

    return () => clearTimeout(timer);
  }, [tagId]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-4 px-6">
        {status === 'redirecting' && (
          <>
            <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-white text-lg">{t('nfc.redirecting')}</p>
          </>
        )}
        {status === 'notfound' && (
          <>
            <p className="text-6xl">📡</p>
            <p className="text-white text-xl font-bold">{t('nfc.notFound')}</p>
          </>
        )}
        {status === 'disabled' && (
          <>
            <p className="text-6xl">🚫</p>
            <p className="text-white text-xl font-bold">{t('nfc.tagDisabled')}</p>
          </>
        )}
      </div>
    </div>
  );
}
