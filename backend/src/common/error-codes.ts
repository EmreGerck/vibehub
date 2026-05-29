import { HttpStatus } from '@nestjs/common';

/**
 * Central registry of error codes shown to users. Support staff decode codes
 * by looking them up here (and in the /dashboard/admin/error-codes page).
 *
 * Number ranges by domain:
 *   1xxx  — orders / checkout / payment
 *   2xxx  — auth
 *   3xxx  — vendor / tenant
 *   4xxx  — product / catalog
 *   5xxx  — cart
 *   6xxx  — shipping / kargo
 *   9xxx  — internal / unexpected
 *
 * userMessage:
 *   - When set, the customer sees it alongside the code (e.g. "Bu e-posta zaten kayıtlı").
 *   - When omitted, the customer sees only "Bir hata oluştu. Destek: <code>".
 *
 * Severity drives ops attention. P2 = expected user errors (validation), P1 =
 * needs investigation, P0 = system fault — paged.
 */
export type ErrorSeverity = 'P0' | 'P1' | 'P2';

export interface ErrorCodeDefinition {
  code: string;
  httpStatus: number;
  severity: ErrorSeverity;
  domain: string;
  internalDescription: string;
  /** Optional Turkish message safe to surface to the end user. */
  userMessage?: string;
}

export const ERROR_CODES: Record<string, ErrorCodeDefinition> = {
  // ── 1xxx orders / checkout / payment ─────────────────────────────────────
  'VH-1001': {
    code: 'VH-1001',
    httpStatus: HttpStatus.BAD_REQUEST,
    severity: 'P1',
    domain: 'orders',
    internalDescription:
      'Order line cannot be priced — a VIBEHUB_MANAGED product has no manufacturingUnit linked. Vendor or admin must attach a manufacturing unit (with unitCostTRY) before this product can be ordered.',
  },
  'VH-1002': {
    code: 'VH-1002',
    httpStatus: HttpStatus.BAD_REQUEST,
    severity: 'P1',
    domain: 'orders',
    internalDescription:
      'Order line cannot be priced — VIBEHUB_MANAGED product has missing or out-of-range profitSharePct (must be 0–100).',
  },
  'VH-1003': {
    code: 'VH-1003',
    httpStatus: HttpStatus.BAD_REQUEST,
    severity: 'P1',
    domain: 'orders',
    internalDescription:
      'Order line cannot be priced — product category VAT rate (KDV) missing or out of range. Admin must set vatRate on the Category.',
  },
  'VH-1004': {
    code: 'VH-1004',
    httpStatus: HttpStatus.BAD_REQUEST,
    severity: 'P1',
    domain: 'orders',
    internalDescription:
      'Order line cannot be priced — vendor tenant has invalid or missing commissionRate.',
  },

  // ── 2xxx auth ────────────────────────────────────────────────────────────
  'VH-2001': {
    code: 'VH-2001',
    httpStatus: HttpStatus.UNAUTHORIZED,
    severity: 'P2',
    domain: 'auth',
    internalDescription: 'Login failed — email/password mismatch, missing user, or password compare returned false.',
    userMessage: 'E-posta veya şifre hatalı.',
  },
  'VH-2002': {
    code: 'VH-2002',
    httpStatus: HttpStatus.CONFLICT,
    severity: 'P2',
    domain: 'auth',
    internalDescription: 'Registration blocked — email already exists on a User row.',
    userMessage: 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.',
  },
  'VH-2003': {
    code: 'VH-2003',
    httpStatus: HttpStatus.UNAUTHORIZED,
    severity: 'P2',
    domain: 'auth',
    internalDescription: 'MFA challenge JWT failed to verify or has the wrong purpose. Typically expired (>10 min between email/password and OTP submit) or replayed.',
    userMessage: 'Oturum süresi doldu. Lütfen tekrar giriş yapmayı deneyin.',
  },
  'VH-2004': {
    code: 'VH-2004',
    httpStatus: HttpStatus.BAD_REQUEST,
    severity: 'P2',
    domain: 'auth',
    internalDescription: 'MFA OTP code expired (TTL crossed before submit).',
    userMessage: 'Doğrulama kodunun süresi doldu. Yeni bir kod isteyin.',
  },
  'VH-2005': {
    code: 'VH-2005',
    httpStatus: HttpStatus.UNAUTHORIZED,
    severity: 'P2',
    domain: 'auth',
    internalDescription: 'MFA OTP code did not match the stored hash.',
    userMessage: 'Doğrulama kodu hatalı. Tekrar deneyin.',
  },
  'VH-2006': {
    code: 'VH-2006',
    httpStatus: HttpStatus.BAD_REQUEST,
    severity: 'P2',
    domain: 'auth',
    internalDescription: 'Password reset token does not exist, was already used, or expired.',
    userMessage: 'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin.',
  },
  'VH-2007': {
    code: 'VH-2007',
    httpStatus: HttpStatus.BAD_REQUEST,
    severity: 'P2',
    domain: 'auth',
    internalDescription: 'Change-password flow: supplied currentPassword did not match the stored hash.',
    userMessage: 'Mevcut şifreniz hatalı.',
  },
  'VH-2008': {
    code: 'VH-2008',
    httpStatus: HttpStatus.BAD_REQUEST,
    severity: 'P2',
    domain: 'auth',
    internalDescription: 'Delete-account confirmation: supplied password did not match.',
    userMessage: 'Şifre hatalı.',
  },
  'VH-2009': {
    code: 'VH-2009',
    httpStatus: HttpStatus.BAD_REQUEST,
    severity: 'P2',
    domain: 'auth',
    internalDescription: 'Account deletion blocked — user still has active orders (PLACED/CONFIRMED/SHIPPED/REFUND_REQUESTED).',
    userMessage: 'Açık siparişleriniz olduğu için hesabınızı şu an silemezsiniz. Siparişler tamamlandıktan sonra tekrar deneyin.',
  },

  // ── 3xxx vendor / tenant ─────────────────────────────────────────────────
  'VH-3001': {
    code: 'VH-3001',
    httpStatus: HttpStatus.CONFLICT,
    severity: 'P2',
    domain: 'vendor',
    internalDescription: 'Vendor application rejected — owner email is already linked to an existing User row.',
    userMessage: 'Bu e-posta adresi zaten kayıtlı. Var olan hesabınızla giriş yapıp başvuruyu sürdürebilirsiniz.',
  },
  'VH-3002': {
    code: 'VH-3002',
    httpStatus: HttpStatus.CONFLICT,
    severity: 'P2',
    domain: 'vendor',
    internalDescription: 'Vendor application rejected — store slug is already taken by another tenant.',
    userMessage: 'Bu mağaza adresi (slug) başka bir mağaza tarafından kullanılıyor. Farklı bir adres seçin.',
  },

  // ── 4xxx product / catalog ───────────────────────────────────────────────
  'VH-4001': {
    code: 'VH-4001',
    httpStatus: HttpStatus.BAD_REQUEST,
    severity: 'P2',
    domain: 'product',
    // Vendor-facing — they're an internal user, the filter exposes internalDescription to them.
    internalDescription:
      'A product cannot be set to VIBEHUB_MANAGED (or published while VIBEHUB_MANAGED) without a manufacturingUnit attached. Attach a manufacturing unit with a positive unitCostTRY before publishing.',
  },

  // ── 9xxx internal / unexpected ───────────────────────────────────────────
  'VH-9000': {
    code: 'VH-9000',
    httpStatus: HttpStatus.BAD_REQUEST,
    severity: 'P2',
    domain: 'system',
    internalDescription: 'Generic 4xx error (validation, business rule) that has not yet been assigned a specific code.',
  },
  'VH-9401': {
    code: 'VH-9401',
    httpStatus: HttpStatus.UNAUTHORIZED,
    severity: 'P2',
    domain: 'system',
    internalDescription: 'Generic 401 — authentication required or token rejected.',
  },
  'VH-9403': {
    code: 'VH-9403',
    httpStatus: HttpStatus.FORBIDDEN,
    severity: 'P2',
    domain: 'system',
    internalDescription: 'Generic 403 — caller is authenticated but lacks permission for this resource.',
  },
  'VH-9404': {
    code: 'VH-9404',
    httpStatus: HttpStatus.NOT_FOUND,
    severity: 'P2',
    domain: 'system',
    internalDescription: 'Generic 404 — resource does not exist.',
  },
  'VH-9429': {
    code: 'VH-9429',
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    severity: 'P2',
    domain: 'system',
    internalDescription: 'Rate limit hit. Backoff and retry; if a real user is being limited, raise the bucket.',
  },
  'VH-9999': {
    code: 'VH-9999',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    severity: 'P0',
    domain: 'system',
    internalDescription: 'Unhandled exception — investigate the stack stored on UserErrorLog. Probably a bug.',
  },
};

/**
 * Map an arbitrary HTTP status (from a non-coded HttpException) to the closest
 * generic code. Used by the global filter when a thrown HttpException did not
 * carry a code of its own.
 */
export function codeForHttpStatus(status: number): string {
  switch (status) {
    case HttpStatus.UNAUTHORIZED: return 'VH-9401';
    case HttpStatus.FORBIDDEN:    return 'VH-9403';
    case HttpStatus.NOT_FOUND:    return 'VH-9404';
    case HttpStatus.TOO_MANY_REQUESTS: return 'VH-9429';
    default:
      return status >= 500 ? 'VH-9999' : 'VH-9000';
  }
}
