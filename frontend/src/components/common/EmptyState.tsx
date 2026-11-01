import React from 'react';
import { Database, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionText,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="glass-card flex flex-col items-center justify-center p-10 text-center my-4">
      <div className="icon-well h-14 w-14 text-violet-200 mb-4">{icon || <Database className="h-6 w-6" />}</div>
      <h3 className="font-display text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400 max-w-md leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button onClick={onAction} className="btn-primary mt-5">
          {actionText}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
