import React from 'react';
import { Recommendation } from '@/lib/api/types';
import { Lightbulb, Zap, ArrowUpRight } from 'lucide-react';

interface RecommendationsListCardProps {
  recommendations: Recommendation[];
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export function RecommendationsListCard({
  recommendations,
  onGenerate,
  isGenerating,
}: RecommendationsListCardProps) {
  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
            Med Priority
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30 uppercase">
            Low Priority
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xs p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Actionable Recommendations</h3>
            <p className="text-xs text-slate-400">
              Evidence-based AI visibility optimization strategies
            </p>
          </div>
        </div>

        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Zap className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Synthesizing...' : 'Generate New'}
          </button>
        )}
      </div>

      {(!recommendations || recommendations.length === 0) ? (
        <div className="text-center py-8 text-xs text-slate-500">
          No recommendations generated yet for this project.
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div>
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-400 block mb-0.5">
                    {rec.recommendation_type?.replace(/_/g, ' ') || 'Strategy'}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100">{rec.title}</h4>
                </div>
                <div>{getPriorityBadge(rec.priority)}</div>
              </div>

              <p className="text-xs text-slate-300 mb-2.5 leading-relaxed">{rec.description}</p>

              {rec.evidence && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                    Evidence:{' '}
                    <strong className="text-slate-300 font-normal">
                      {typeof rec.evidence.reason === 'string'
                        ? rec.evidence.reason
                        : JSON.stringify(rec.evidence)}
                    </strong>
                  </span>
                  <span className="capitalize px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                    {rec.status.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
