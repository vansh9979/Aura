import React from 'react';
import { CompetitorItem } from '@/lib/api/types';
import { Users, Trophy } from 'lucide-react';

interface CompetitorsCardProps {
  competitors: CompetitorItem[] | null;
  targetBrand?: string;
}

export function CompetitorsCard({ competitors, targetBrand }: CompetitorsCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xs p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Competitor Visibility Landscape</h3>
            <p className="text-xs text-slate-400">
              Benchmark vs top competitors across analyzed AI responses
            </p>
          </div>
        </div>
      </div>

      {!competitors || competitors.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500">
          No competitor brand mentions detected for this period.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="pb-3 font-medium">Rank</th>
                <th className="pb-3 font-medium">Competitor Brand</th>
                <th className="pb-3 font-medium text-right">Visibility</th>
                <th className="pb-3 font-medium text-right">Mentions</th>
                <th className="pb-3 font-medium text-right">Avg Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {competitors.map((comp, idx) => (
                <tr key={comp.name} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 text-slate-500 font-mono text-[11px]">
                    #{idx + 1}
                  </td>
                  <td className="py-3 font-medium text-slate-100 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        idx === 0 ? 'bg-amber-400' : 'bg-sky-400'
                      }`}
                    ></span>
                    {comp.name}
                    {idx === 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Trophy className="h-2.5 w-2.5" /> Market Leader
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right font-bold text-slate-100">
                    {comp.visibility_percentage.toFixed(1)}%
                  </td>
                  <td className="py-3 text-right font-medium text-slate-300">
                    {comp.mention_count}
                  </td>
                  <td className="py-3 text-right font-mono text-slate-300">
                    {comp.average_position ? `#${comp.average_position}` : '—'}
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
