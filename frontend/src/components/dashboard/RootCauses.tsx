import React from 'react';
import { RootCause } from '@/lib/api/types';
import { AlertTriangle, AlertCircle, Info, Sparkles } from 'lucide-react';

interface RootCausesProps {
  rootCauses: RootCause[];
  diagnosis?: string;
}

export function RootCauses({ rootCauses, diagnosis }: RootCausesProps) {
  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
            <AlertTriangle className="h-3 w-3" /> High Severity
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
            <AlertCircle className="h-3 w-3" /> Medium Severity
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30 uppercase">
            <Info className="h-3 w-3" /> Low Severity
          </span>
        );
    }
  };

  return (
    <div className="glass-card p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Root-Cause Intelligence</h3>
            <p className="text-xs text-slate-400">Deterministic factors driving brand visibility scores</p>
          </div>
        </div>

        {diagnosis && (
          <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/30 mb-4 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-300 uppercase tracking-wider text-[10px] mb-1">
              <Info className="h-3 w-3" /> Executive Diagnosis
            </div>
            <p className="text-slate-200 leading-relaxed">{diagnosis}</p>
          </div>
        )}

        {(!rootCauses || rootCauses.length === 0) ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No critical visibility root causes detected for this project.
          </div>
        ) : (
          <div className="space-y-3">
            {rootCauses.map((rc, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-slate-700/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-slate-200">
                    {rc.type.replace(/_/g, ' ')}
                  </span>
                  <div>{getSeverityBadge(rc.severity)}</div>
                </div>

                <p className="text-xs text-slate-300 mb-2 leading-relaxed">{rc.explanation}</p>

                {rc.evidence && rc.evidence.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Evidence
                    </span>
                    <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4">
                      {rc.evidence.map((ev, eIdx) => (
                        <li key={eIdx}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
