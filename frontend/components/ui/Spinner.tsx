export function Spinner({ size = 'md', variant = 'default' }: { size?: 'sm' | 'md' | 'lg'; variant?: 'default' | 'dots' | 'gradient' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };
  const dotSizes = { sm: 'h-1 w-1', md: 'h-1.5 w-1.5', lg: 'h-2.5 w-2.5' };

  if (variant === 'dots') {
    return (
      <span className="inline-flex items-center gap-1" role="status" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`${dotSizes[size]} rounded-full bg-purple-500 inline-block`}
            style={{
              animation: 'dotsBounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </span>
    );
  }

  if (variant === 'gradient') {
    return (
      <span
        className={`relative inline-block ${sizes[size]}`}
        role="status"
        aria-label="Loading"
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, #a855f7 60deg, #ec4899 240deg, transparent 360deg)',
            mask: 'radial-gradient(circle, transparent 55%, black 56%)',
            WebkitMask: 'radial-gradient(circle, transparent 55%, black 56%)',
            animation: 'spin 0.9s linear infinite',
          }}
        />
      </span>
    );
  }

  return (
    <svg
      className={`animate-spin text-purple-600 dark:text-purple-500 ${sizes[size]}`}
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
