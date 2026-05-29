'use client';

import { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import type { ParsedApiError } from '../../lib/error-codes';

interface CodedErrorAlertProps {
  /** Output of parseApiError(). When `isCoded` is false the alert falls back to the legacy plain-message look. */
  error: ParsedApiError;
}

/**
 * Renders user-facing errors as a code + trace + support hint, with a copy
 * button so the customer can paste "VH-1001 / abc123" into a support email.
 * For non-coded fallbacks (network down, legacy endpoint) shows the message
 * inline like the original Alert component.
 */
export function CodedErrorAlert({ error }: CodedErrorAlertProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  if (!error.isCoded || !error.errorCode) {
    return (
      <div className="rounded-xl border bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
        {error.message}
      </div>
    );
  }

  const handleCopy = async () => {
    const payload = `${error.errorCode} / ${error.traceId}`;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — selection still available manually
    }
  };

  return (
    <div className="rounded-xl border bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 text-sm space-y-2">
      <div>{error.supportMessage ?? t('errors.supportFallback')}</div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className="rounded bg-red-100 dark:bg-red-900/60 px-2 py-1 font-bold">
          {error.errorCode}
        </span>
        <span className="text-red-600/80 dark:text-red-300/80">
          {t('errors.trace')}: <span className="select-all">{error.traceId}</span>
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="ml-auto rounded border border-red-300 dark:border-red-700 px-2 py-1 hover:bg-red-100 dark:hover:bg-red-900/60 transition"
        >
          {copied ? t('errors.copied') : t('errors.copyCode')}
        </button>
      </div>
    </div>
  );
}
