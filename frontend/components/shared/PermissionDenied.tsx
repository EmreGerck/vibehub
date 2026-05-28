'use client';

import Link from 'next/link';
import { useI18n } from '../../lib/i18n';

interface PermissionDeniedProps {
  requiredPermission?: string;
  /** Optional custom title/description override */
  title?: string;
  description?: string;
}

/**
 * Friendly empty state shown when a vendor visits a page they don't have
 * permission for. Avoids the cliff-fall of a 403 wall and tells them which
 * permission they're missing so they know what to ask the admin for.
 */
export function PermissionDenied({
  requiredPermission,
  title,
  description,
}: PermissionDeniedProps) {
  const t = useI18n((s) => s.t);

  return (
    <div className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-2xl">
          🔒
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          {title ?? t('permDenied.title')}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {description ?? t('permDenied.description')}
        </p>
        {requiredPermission && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('permDenied.required')}:
            </span>
            <code className="font-mono text-xs text-purple-600 dark:text-purple-400 font-semibold">
              {requiredPermission}
            </code>
          </div>
        )}
        <div className="mt-6">
          <Link href="/dashboard/vendor" className="btn-primary inline-block">
            {t('permDenied.backToDashboard')}
          </Link>
        </div>
      </div>
    </div>
  );
}
