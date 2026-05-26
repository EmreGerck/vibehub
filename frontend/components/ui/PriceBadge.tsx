'use client';

import { formatPrice } from '../../lib/format';
import { useI18n } from '../../lib/i18n';

interface PriceBadgeProps {
  price: number;
  compareAtPrice?: number | null;
  /** Show large style (for PDP) vs compact (for cards) */
  size?: 'sm' | 'lg';
}

/**
 * Displays product price with optional sale badge.
 * When compareAtPrice > price, shows strikethrough original + discount %.
 */
export function PriceBadge({ price, compareAtPrice, size = 'sm' }: PriceBadgeProps) {
  const t = useI18n((s) => s.t);
  const isOnSale = compareAtPrice != null && compareAtPrice > price;
  const discountPct = isOnSale ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;

  if (!isOnSale) {
    return (
      <span className={`font-bold text-gray-900 dark:text-white ${size === 'lg' ? 'text-2xl' : 'text-sm'}`}>
        {formatPrice(price)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className={`font-bold text-gray-900 dark:text-white ${size === 'lg' ? 'text-2xl' : 'text-sm'}`}>
        {formatPrice(price)}
      </span>
      <span className={`text-gray-400 dark:text-gray-500 line-through ${size === 'lg' ? 'text-base' : 'text-xs'}`}>
        {formatPrice(compareAtPrice)}
      </span>
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold ${size === 'lg' ? 'text-xs' : 'text-[10px]'}`}>
        -{discountPct}%
      </span>
    </span>
  );
}

/**
 * "SALE" overlay badge for product card images.
 */
export function SaleBadge({ compareAtPrice, price }: { compareAtPrice?: number | null; price: number }) {
  if (!compareAtPrice || compareAtPrice <= price) return null;

  return (
    <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md animate-pop z-10">
      Sale
    </span>
  );
}
