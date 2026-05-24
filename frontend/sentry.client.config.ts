/**
 * Sentry client-side configuration (browser).
 * This file is automatically loaded by @sentry/nextjs before the app renders.
 * Set NEXT_PUBLIC_SENTRY_DSN in your .env.local (or Vercel env vars).
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV ?? 'development',

  // Capture 20% of transactions in production (adjust as needed)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Session replay: record 10% of sessions, 100% of error sessions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,   // mask all text by default (KVKK compliance)
      blockAllMedia: true,
    }),
  ],

  // Don't fire in local dev unless DSN is explicitly set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
