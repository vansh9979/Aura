'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  numericValue?: number;
  formatValue?: (n: number) => string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  tooltip?: string;
  colorScheme?: 'indigo' | 'emerald' | 'amber' | 'sky' | 'purple';
}

const COLOR_VARIANTS = {
  indigo: 'from-violet-500/20 to-indigo-500/5 text-violet-200 border-violet-400/25',
  emerald: 'from-emerald-400/20 to-teal-500/5 text-emerald-200 border-emerald-400/25',
  amber: 'from-amber-400/20 to-orange-500/5 text-amber-200 border-amber-400/25',
  sky: 'from-cyan-400/20 to-sky-500/5 text-cyan-200 border-cyan-400/25',
  purple: 'from-fuchsia-400/20 to-violet-500/5 text-fuchsia-200 border-fuchsia-400/25',
};

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return val;
}

export function MetricCard({
  title,
  value,
  numericValue,
  formatValue,
  subtitle,
  icon,
  trend,
  trendLabel,
  colorScheme = 'indigo',
}: MetricCardProps) {
  const animated = useCountUp(numericValue ?? 0);
  const display =
    numericValue !== undefined && formatValue ? formatValue(animated) : value;

  return (
    <div className="glass-card p-5 group cursor-default">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {title}
        </span>
        <div
          className={`p-2 rounded-xl border bg-gradient-to-br transition-transform duration-300 group-hover:scale-110 ${COLOR_VARIANTS[colorScheme]}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <div className="font-display text-3xl font-bold tracking-tight text-white tabular-nums">
          {display}
        </div>
        {subtitle && (
          <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 min-h-[2rem] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {trendLabel && (
        <div className="mt-3 pt-3 border-t border-white/8 flex items-center gap-1.5 text-xs">
          {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
          {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-rose-400" />}
          {trend === 'neutral' && <Minus className="h-3.5 w-3.5 text-slate-400" />}
          <span
            className={
              trend === 'up'
                ? 'text-emerald-300 font-medium'
                : trend === 'down'
                ? 'text-rose-300 font-medium'
                : 'text-slate-400'
            }
          >
            {trendLabel}
          </span>
        </div>
      )}
    </div>
  );
}
