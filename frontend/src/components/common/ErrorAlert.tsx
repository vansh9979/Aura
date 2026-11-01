import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
}

export function ErrorAlert({
  title = 'Failed to load data',
  message,
  details,
  onRetry,
}: ErrorAlertProps) {
  return (
    <div className="glass-card p-5 border-rose-400/25">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-rose-500/15 p-2 text-rose-300 border border-rose-400/20">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-rose-100">{title}</h4>
          <p className="mt-1 text-sm text-rose-100/80">{message}</p>
          {details && (
            <p className="mt-2 text-xs font-mono bg-rose-950/40 p-2 rounded-lg border border-rose-900/40 text-rose-200 break-all">
              {details}
            </p>
          )}
          {onRetry && (
            <button onClick={onRetry} className="btn-ghost mt-3 px-3 py-1.5 text-xs text-rose-100">
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
