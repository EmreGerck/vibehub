'use client';

import { useState } from 'react';
import { brandGradient } from '../../lib/format';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  /** Tenant slug used to generate the fallback gradient */
  tenantSlug?: string;
}

/**
 * Renders a product image with a branded gradient placeholder when the image
 * is missing or fails to load (broken URL, wrong format, blocked by ORB, etc.)
 */
export function ProductImage({ src, alt, className = '', tenantSlug }: ProductImageProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className={`flex items-center justify-center w-full h-full ${className}`}
        style={{ background: brandGradient(tenantSlug) }}
      >
        <span className="text-5xl font-black text-white/20 group-hover:text-white/30 transition-colors select-none">
          {alt?.[0]?.toUpperCase() ?? '?'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
