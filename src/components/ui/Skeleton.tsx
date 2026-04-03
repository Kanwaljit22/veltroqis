import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div
    className={cn('animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700', className)}
  />
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-8" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="bg-surface rounded-xl border border-base p-5 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-2 w-full" />
    <div className="flex justify-between">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
);

export const SkeletonStatCard: React.FC = () => (
  <div className="bg-surface rounded-xl border border-base p-5">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
    </div>
  </div>
);

export const PageLoadingSpinner: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading...',
  className,
}) => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className={cn('flex flex-col items-center justify-center py-16 gap-3', className)}
  >
    <div
      className="h-8 w-8 rounded-full border-2 border-base border-t-hi animate-spin"
      aria-hidden
    />
    <p className="text-sm text-dim">{message}</p>
  </div>
);

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'Something went wrong',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
      <span className="text-red-500 text-xl">!</span>
    </div>
    <p className="text-sm font-medium text-body">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Try again
      </button>
    )}
  </div>
);
