import React from 'react';
import { SourceGap } from '@/lib/api/types';
import { Link2, AlertCircle, ArrowUpRight } from 'lucide-react';

interface SourceGapsProps {
  sourceGaps: SourceGap[];
  targetBrand?: string;
}

export function SourceGaps({ sourceGaps, targetBrand = 'Target Brand' }: SourceGapsProps) {
  const getStatusBadge = (gap: number) => {
    if (gap >= 5) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
          Critical Authority Gap
        </span>
      );
    }
    if (gap >= 2) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
          Moderate Gap
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase">
        Minor Gap
      </span>
    );
  };

  return (
    <div className="glass-card p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Link2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Source & Citation Authority Gaps</h3>
            <p className="text-xs text-slate-400">
              Domains frequently cited by AI for competitors where {targetBrand} lacks coverage
            </p>
          </div>
        </div>

        {(!sourceGaps || sourceGaps.length === 0) ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No significant citation domain gaps identified yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sourceGaps.slice(0, 6).map((gap) => (
              <div
                key={gap.domain}
                className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    <strong>{gap.domain}</strong>
                  </div>
                  {getStatusBadge(gap.citation_gap)}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Competitors</span>
                    <span className="font-semibold text-slate-200">{gap.competitor_citations} citations</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Your Brand</span>
                    <span className="font-semibold text-slate-300">{gap.target_citations} citations</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase">Citation Gap</span>
                    <span className="font-bold text-rose-400">-{gap.citation_gap} citations</span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Evidence: Competitor grounding frequency advantage</span>
                  <span className="text-indigo-400 font-medium flex items-center gap-0.5">
                    Target Outreach <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
