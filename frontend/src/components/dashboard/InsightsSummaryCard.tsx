import React from 'react';
import { InsightsResponse } from '@/lib/api/types';
import { Sparkles, Info, Layers } from 'lucide-react';

interface InsightsSummaryCardProps {
  insights: InsightsResponse | null;
}

export function InsightsSummaryCard({ insights }: InsightsSummaryCardProps) {
  if (!insights) {
    return null;
  }

  const getImpactBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
            High Severity
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
            Med Severity
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30 uppercase">
            Low Severity
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xs p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">AI Search Intelligence & Diagnosis</h3>
            <p className="text-xs text-slate-400">Root causes and AI landscape analysis</p>
          </div>
        </div>

        {/* Executive Diagnosis Box */}
        {insights.diagnosis && (
          <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/30 mb-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Executive Diagnosis
            </div>
            <p className="text-xs md:text-sm text-indigo-100 leading-relaxed">
              {insights.diagnosis}
            </p>
          </div>
        )}

        {/* Root Causes List */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Identified Root Causes ({insights.root_causes?.length || 0})
          </h4>

          {(!insights.root_causes || insights.root_causes.length === 0) ? (
            <p className="text-xs text-slate-500 italic">No critical root causes detected.</p>
          ) : (
            <div className="space-y-2.5">
              {insights.root_causes.map((rc, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-200">
                      {rc.type.replace(/_/g, ' ')}
                    </span>
                    {getImpactBadge(rc.severity)}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-2">{rc.explanation}</p>
                  {rc.evidence && rc.evidence.length > 0 && (
                    <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4 border-t border-slate-800/80 pt-2">
                      {rc.evidence.map((ev, eIdx) => (
                        <li key={eIdx}>{ev}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Topic Gaps Section if present */}
      {insights.topic_gaps && insights.topic_gaps.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-amber-400" />
            Topic Coverage Gaps
          </h4>
          <div className="space-y-2">
            {insights.topic_gaps.map((tg, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-2.5 rounded bg-slate-950/60 border border-slate-800"
              >
                <div>
                  <span className="font-semibold text-slate-200 uppercase text-[11px]">
                    {tg.category}
                  </span>
                  <div className="text-[11px] text-slate-400">
                    Leader: <span className="text-slate-300 font-medium">{tg.strongest_competitor}</span> ({tg.competitor_visibility}%)
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-rose-400 font-semibold">{tg.target_visibility}% Brand Visibility</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
