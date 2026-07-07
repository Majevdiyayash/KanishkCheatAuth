import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style = {} }) => (
  <div
    className={`animate-pulse rounded ${className}`}
    style={{
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.6s infinite linear',
      ...style
    }}
  />
);

export const SkeletonCard: React.FC = () => (
  <div
    className="rounded-xl p-5 space-y-3"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
  >
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="h-3 w-2/3" />
    <Skeleton className="h-3 w-1/2" />
    <div className="flex gap-2 pt-1">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-2">
    {/* Header */}
    <div className="flex gap-4 px-3 py-2">
      {[40, 25, 20, 15].map((w, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${w}%` } as React.CSSProperties} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex gap-4 px-3 py-3 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        {[40, 25, 20, 15].map((w, j) => (
          <Skeleton key={j} className="h-3 rounded" style={{ width: `${w}%` } as React.CSSProperties} />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonStat: React.FC = () => (
  <div
    className="rounded-xl p-5 space-y-3"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
  >
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-8 w-2/3" />
    <Skeleton className="h-2 w-full rounded-full" />
  </div>
);
