import React from 'react';
import { Recommendation } from '@/lib/api/types';
import { Lightbulb, Zap, ArrowUpRight, CheckCircle2, ShieldAlert } from 'lucide-react';

interface RecommendationsProps {
  recommendations: Recommendation[];
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export function Recommendations({
  recommendations,
  onGenerate,
  isGenerating,
}: RecommendationsProps) {
  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
            <ShieldAlert className="h-3 w-3" /> High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
            Medium Priority
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30 uppercase">
            Low Priority
          </span>
        );
    }
  };

  // Sort high priority first
  const sortedRecs = [...(recommendations || [])].sort((a, b) => {
    const pOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
    return (pOrder[a.priority?.toLowerCase()] || 4) - (pOrder[b.priority?.toLowerCase()] || 4);
  });

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Actionable Optimization Recommendations</h3>
            <p className="text-xs text-slate-400">
              Evidence-based AI visibility enhancement strategies prioritized by expected impact
            </p>
          </div>
        </div>

        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="btn-primary disabled:opacity-50"
          >
            <Zap className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Synthesizing with Gemini...' : 'Generate New Recommendations'}
          </button>
        )}
      </div>

      {sortedRecs.length === 0 ? (
        <div className="text-center py-10 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
          No recommendations recorded yet for this project. Click above to synthesize recommendations from recent search intelligence.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedRecs.map((rec) => {
            const isHigh = rec.priority?.toLowerCase() === 'high';
            return (
              <div
                key={rec.id}
                className={`p-5 rounded-xl border transition-all hover:-translate-y-0.5 ${
                  isHigh
                    ? 'border-violet-400/35 bg-gradient-to-b from-violet-950/30 to-transparent shadow-[0_0_24px_rgba(124,58,237,0.12)]'
                    : 'border-white/8 bg-black/20 hover:border-violet-300/25'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-400 block mb-0.5">
                      {rec.recommendation_type?.replace(/_/g, ' ') || 'Strategy'}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-100">{rec.title}</h4>
                  </div>
                  <div>{getPriorityBadge(rec.priority)}</div>
                </div>

                <p className="text-xs text-slate-300 mb-3 leading-relaxed">{rec.description}</p>

                {rec.evidence && (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-400 mb-3">
                    <span className="text-slate-300 font-semibold block text-[10px] uppercase mb-0.5">
                      Evidence Grounding
                    </span>
                    {typeof rec.evidence.reason === 'string'
                      ? rec.evidence.reason
                      : JSON.stringify(rec.evidence)}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 capitalize flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Status: <strong className="text-slate-300 font-normal">{rec.status.replace(/_/g, ' ')}</strong>
                  </span>
                  <span className="text-indigo-400 font-medium flex items-center gap-0.5">
                    Apply Strategy <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
