import React from 'react';
import { SourceGap } from '@/lib/api/types';
import { Link2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SourcesCardProps {
  sourceGaps: SourceGap[];
}

export function SourcesCard({ sourceGaps }: SourcesCardProps) {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'critical_gap':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
            Critical Gap
          </span>
        );
      case 'moderate_gap':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
            Moderate Gap
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
            Parity
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xs p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Link2 className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Source & Citation Intelligence</h3>
          <p className="text-xs text-slate-400">
            Domain authority gaps extracted from Google Search grounding
          </p>
        </div>
      </div>

      {sourceGaps.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500">
          No source gap data detected.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="pb-3 font-medium">Domain</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Brand Citations</th>
                <th className="pb-3 font-medium text-right">Competitor Citations</th>
                <th className="pb-3 font-medium text-right">Citation Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sourceGaps.map((gap) => (
                <tr key={gap.domain} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 font-mono text-slate-200">{gap.domain}</td>
                  <td className="py-3">{getStatusBadge(gap.status)}</td>
                  <td className="py-3 text-right font-semibold text-slate-100">
                    {gap.target_citations}
                  </td>
                  <td className="py-3 text-right font-medium text-slate-300">
                    {gap.competitor_citations}
                  </td>
                  <td className="py-3 text-right font-semibold text-rose-400">
                    -{gap.citation_gap}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
