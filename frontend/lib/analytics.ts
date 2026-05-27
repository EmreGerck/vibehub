/**
 * Google Analytics 4 + Ads conversion event helpers.
 * ────────────────────────────────────────────────────
 * Use these to fire standard e-commerce events for remarketing audiences,
 * abandoned-cart targeting, and conversion tracking in Google Ads.
 *
 * No-ops gracefully if `gtag` isn't loaded (dev without GA configured).
 *
 * Usage:
 *   import { trackViewItem, trackAddToCart, trackPurchase } from '@/lib/analytics';
 *   trackViewItem({ id, title, price, currency, category, vendor });
 */

declare global {
  interface Window {
    gtag?: (command: string, eventName: string, params: Record<string, unknown>) => void;
    dataLayer?: unknown[];
  }
}

interface AnalyticsItem {
  id: string;
  title: string;
  price: number;
  currency?: string;
  category?: string;
  vendor?: string;
  quantity?: number;
}

function toGa4Item(item: AnalyticsItem) {
  return {
    item_id: item.id,
    item_name: item.title,
    price: item.price,
    currency: item.currency ?? 'TRY',
    item_category: item.category,
    item_brand: item.vendor,
    quantity: item.quantity ?? 1,
  };
}

function track(eventName: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', eventName, params);
  } catch {
    // Silently ignore — never break UX for analytics failures
  }
}

/** Product detail page viewed. Critical for remarketing audiences. */
export function trackViewItem(item: AnalyticsItem): void {
  track('view_item', {
    currency: item.currency ?? 'TRY',
    value: item.price,
    items: [toGa4Item(item)],
  });
}

/** Item added to cart. Triggers cart-abandonment audiences. */
export function trackAddToCart(item: AnalyticsItem): void {
  track('add_to_cart', {
    currency: item.currency ?? 'TRY',
    value: item.price * (item.quantity ?? 1),
    items: [toGa4Item(item)],
  });
}

/** Item removed from cart — useful negative signal. */
export function trackRemoveFromCart(item: AnalyticsItem): void {
  track('remove_from_cart', {
    currency: item.currency ?? 'TRY',
    value: item.price * (item.quantity ?? 1),
    items: [toGa4Item(item)],
  });
}

/** User entered checkout flow. */
export function trackBeginCheckout(items: AnalyticsItem[], total: number, currency = 'TRY'): void {
  track('begin_checkout', {
    currency,
    value: total,
    items: items.map(toGa4Item),
  });
}

/** Purchase completed. Required for Google Ads conversion tracking. */
export function trackPurchase(opts: {
  transactionId: string;
  total: number;
  currency?: string;
  shipping?: number;
  tax?: number;
  items: AnalyticsItem[];
}): void {
  track('purchase', {
    transaction_id: opts.transactionId,
    currency: opts.currency ?? 'TRY',
    value: opts.total,
    shipping: opts.shipping ?? 0,
    tax: opts.tax ?? 0,
    items: opts.items.map(toGa4Item),
  });
}

/** User searched. Helps identify content gaps and intent. */
export function trackSearch(query: string): void {
  track('search', { search_term: query });
}

/** Product added to wishlist — signals high commercial intent. */
export function trackAddToWishlist(item: AnalyticsItem): void {
  track('add_to_wishlist', {
    currency: item.currency ?? 'TRY',
    value: item.price,
    items: [toGa4Item(item)],
  });
}

/** User signed up. */
export function trackSignUp(method: 'email' | 'google' | 'otp' = 'email'): void {
  track('sign_up', { method });
}
