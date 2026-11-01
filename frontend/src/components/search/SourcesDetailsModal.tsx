'use client';

import React from 'react';
import type { SearchRunSourcesResponse } from '@/lib/api/types';
import { X, Link2, ExternalLink, Globe } from 'lucide-react';

interface SourcesDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourcesData: SearchRunSourcesResponse | null;
}

export function SourcesDetailsModal({
  isOpen,
  onClose,
  sourcesData,
}: SourcesDetailsModalProps) {
  if (!isOpen || !sourcesData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-scrim">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col glass-card p-6 text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Extracted Citations & Sources</h3>
              <p className="text-xs text-slate-400">
                {sourcesData.sources_count} source domains, {sourcesData.citations_count} citations grounded via Google Search
              </p>
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
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {sourcesData.citations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No citations or sources detected in this search response.
            </div>
          ) : (
            <div className="space-y-3">
              {sourcesData.citations.map((citation) => {
                const src = citation.source;
                const domain = src?.domain || 'unknown';
                const url = src?.url || '';
                const title = src?.title || url || 'Grounded Source';

                return (
                  <div
                    key={citation.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            <Globe className="h-2.5 w-2.5" />
                            {domain}
                          </span>
                          {citation.citation_position && (
                            <span className="text-[10px] font-mono text-slate-400">
                              Position #{citation.citation_position}
                            </span>
                          )}
                          {citation.citation_type && (
                            <span className="text-[10px] uppercase text-slate-500 font-semibold">
                              {citation.citation_type}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                          {title}
                        </h4>
                      </div>

                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 transition-colors shrink-0"
                          title="Open Grounding Source"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    {citation.cited_text && (
                      <p className="text-[11px] text-slate-400 italic bg-slate-900/80 p-2 rounded border border-slate-800/80 mt-1">
                        &ldquo;{citation.cited_text}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
