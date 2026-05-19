'use client';

import Link from 'next/link';
import { useI18n } from '../lib/i18n';

export default function NotFound() {
  const t = useI18n((s) => s.t);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-extrabold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent mb-4">
          404
        </p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {t('notFound.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          {t('notFound.desc')}
        </p>
        <Link href="/" className="btn-primary px-6 py-2.5 text-sm inline-flex">
          {t('notFound.backHome')}
        </Link>
      </div>
    </div>
  );
}
