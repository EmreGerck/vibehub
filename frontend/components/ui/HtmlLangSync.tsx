'use client';

import { useEffect } from 'react';
import { useI18n } from '../../lib/i18n';

/**
 * Syncs the <html lang="..."> attribute with the active i18n locale.
 * Rendered once inside <Providers>.
 */
export function HtmlLangSync() {
  const locale = useI18n((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
