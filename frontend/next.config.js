// @ts-check
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    // Allow images from any source — vendors paste direct-upload URLs from
    // various CDNs (imgbb, Cloudinary, Unsplash, Google, Railway uploads, etc.)
    remotePatterns: [
      // Local backend uploads (dev)
      { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/uploads/**' },
      // Railway backend uploads (production)
      { protocol: 'https', hostname: '*.up.railway.app', pathname: '/**' },
      // Common image hosts vendors use
      { protocol: 'https', hostname: 'i.ibb.co', pathname: '/**' },
      { protocol: 'https', hostname: 'ibb.co', pathname: '/**' },
      { protocol: 'https', hostname: '*.ibb.co', pathname: '/**' },
      { protocol: 'https', hostname: 'i.imgur.com', pathname: '/**' },
      { protocol: 'https', hostname: 'imgur.com', pathname: '/**' },
      // Google / GCP (thumbnails, avatars)
      { protocol: 'https', hostname: '*.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      // Cloudinary
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      // Unsplash
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      // AWS S3 / CloudFront
      { protocol: 'https', hostname: '*.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.cloudfront.net', pathname: '/**' },
      // Vercel Blob / CDN
      { protocol: 'https', hostname: '*.vercel-storage.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com', pathname: '/**' },
      // Generic HTTPS fallback — allow any https image
      { protocol: 'https', hostname: '**', pathname: '/**' },
    ],
  },
};

// Wrap with Sentry only when DSN is configured (avoids source-map noise in local dev)
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

module.exports = SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,          // suppress build output noise
      disableLogger: true,   // tree-shake Sentry logger in production
      widenClientFileUpload: true,
      hideSourceMaps: true,  // don't expose source maps to end users
    })
  : nextConfig;
