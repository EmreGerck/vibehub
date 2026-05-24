'use client';

import { useEffect } from 'react';
import { useI18n } from '../lib/i18n';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useI18n((s) => s.t);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-2xl font-semibold">{t('common.somethingWentWrong')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        {error.message || t('common.errorDesc')}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-colors"
      >
        {t('common.tryAgain')}
      </button>
    </div>
  );
}
