export function Skeleton({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div
      className={`bg-gray-200/70 dark:bg-gray-800/70 rounded animate-shimmer ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

export function ProductCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className="card overflow-hidden animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
      <Skeleton className="aspect-square rounded-none" delay={index * 60} />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-16" delay={index * 60 + 80} />
        <Skeleton className="h-4 w-32" delay={index * 60 + 120} />
        <Skeleton className="h-4 w-20" delay={index * 60 + 160} />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}
