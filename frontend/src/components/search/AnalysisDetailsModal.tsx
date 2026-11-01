'use client';

import React from 'react';
import type { SearchRunAnalysisResponse } from '@/lib/api/types';
import { X, Sparkles, CheckCircle2, XCircle, Smile, Hash, Users } from 'lucide-react';

interface AnalysisDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: SearchRunAnalysisResponse | null;
}

export function AnalysisDetailsModal({
  isOpen,
  onClose,
  analysis,
}: AnalysisDetailsModalProps) {
  if (!isOpen || !analysis) return null;

  const tba = analysis.target_brand_analysis;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-scrim">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col glass-card p-6 text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI Response Analysis</h3>
              <p className="text-xs text-slate-400">Target brand: {analysis.target_brand}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content scrollable */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Target Brand KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                Presence
              </span>
              <div className="flex items-center gap-1.5 font-bold text-sm">
                {tba.mentioned ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-300">Mentioned</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-rose-400" />
                    <span className="text-rose-300">Not Mentioned</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                Mention Count
              </span>
              <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100">
                <Hash className="h-4 w-4 text-indigo-400" />
                {tba.mention_count} mentions
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                First Position
              </span>
              <div className="font-bold text-sm text-slate-100 font-mono">
                {tba.positions && tba.positions.length > 0
                  ? `#${tba.positions[0]}`
                  : 'N/A'}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                Perceived Tone
              </span>
              <div className="flex items-center gap-1.5 font-bold text-sm capitalize text-slate-100">
                <Smile className="h-4 w-4 text-amber-400" />
                {tba.overall_sentiment}
                <span className="text-[10px] font-mono text-slate-400">
                  ({tba.sentiment_score != null ? (tba.sentiment_score > 0 ? `+${tba.sentiment_score.toFixed(2)}` : tba.sentiment_score.toFixed(2)) : 'N/A'})
                </span>
              </div>
            </div>
          </div>

          {/* Context Snippets */}
          {tba.context_snippets && tba.context_snippets.length > 0 && (
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-2">
                Contextual Mentions in AI Output
              </span>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                {tba.context_snippets.map((snip, i) => (
                  <li key={i} className="italic">&ldquo;{snip}&rdquo;</li>
                ))}
              </ul>
            </div>
          )}

          {/* Detected Entities Table */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-sky-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Detected Competitors & Entities ({analysis.entities_count})
              </h4>
            </div>

            {analysis.entities.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
                No distinct brand entities detected in this AI response.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-semibold uppercase text-slate-400">
                    <tr>
                      <th className="p-2.5">Entity</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Target Brand?</th>
                      <th className="p-2.5 text-right">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {analysis.entities.map((ent) => (
                      <tr key={ent.id} className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-medium text-slate-100 flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              ent.is_target_brand ? 'bg-indigo-400' : 'bg-slate-500'
                            }`}
                          />
                          {ent.entity_name}
                        </td>
                        <td className="p-2.5 text-slate-400 capitalize">{ent.entity_type}</td>
                        <td className="p-2.5">
                          {ent.is_target_brand ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold">
                              Yes
                            </span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-300">
                          {ent.mention_position ? `#${ent.mention_position}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
