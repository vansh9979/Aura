import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton-wave rounded-md ${className}`} />;
}

export function MetricCardSkeleton() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

export function DashboardContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-24 w-full mb-3" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="glass-card p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-24 w-full mb-3" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}
