'use client';

import React, { useState } from 'react';
import type {
  Prompt,
  SearchRunListItem,
  SearchRunAnalysisResponse,
  SearchRunSourcesResponse,
} from '@/lib/api/types';
import { runSearch, analyzeSearchRun, extractSources } from '@/lib/api/projects';
import { SearchRunCard } from './SearchRunCard';
import { AnalysisDetailsModal } from './AnalysisDetailsModal';
import { SourcesDetailsModal } from './SourcesDetailsModal';
import { SectionHeading } from '@/components/common/SectionHeading';
import {
  Play,
  Calculator,
  RefreshCw,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface SearchRunListProps {
  prompts: Prompt[];
  searchRuns: SearchRunListItem[];
  projectId: string;
  onSearchExecuted: () => void;
  onCalculateMetrics: () => void;
  isCalculatingMetrics?: boolean;
}

export function SearchRunList({
  prompts,
  searchRuns,
  projectId,
  onSearchExecuted,
  onCalculateMetrics,
  isCalculatingMetrics,
}: SearchRunListProps) {
  const [runningPromptId, setRunningPromptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Analysis modal state
  const [selectedAnalysis, setSelectedAnalysis] = useState<SearchRunAnalysisResponse | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);

  // Sources modal state
  const [selectedSources, setSelectedSources] = useState<SearchRunSourcesResponse | null>(null);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState<boolean>(false);

  const handleRunSearch = async (promptId: string) => {
    setRunningPromptId(promptId);
    setError(null);
    try {
      await runSearch(promptId);
      onSearchExecuted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search execution failed.');
    } finally {
      setRunningPromptId(null);
    }
  };

  const handleViewAnalysis = async (searchRunId: string) => {
    try {
      const res = await analyzeSearchRun(searchRunId);
      setSelectedAnalysis(res);
      setIsAnalysisModalOpen(true);
    } catch (err) {
      console.error('Failed to view analysis:', err);
    }
  };

  const handleViewSources = async (searchRunId: string) => {
    try {
      const res = await extractSources(searchRunId);
      setSelectedSources(res);
      setIsSourcesModalOpen(true);
    } catch (err) {
      console.error('Failed to view sources:', err);
    }
  };

  const activePrompts = prompts.filter((p) => p.is_active);

  return (
    <div className="space-y-8">
      <SectionHeading
        title="AI Search Runs & Execution"
        description="Execute prompts against Gemini with Google Search grounding and analyze brand presence"
        action={
          <button
            onClick={onCalculateMetrics}
            disabled={isCalculatingMetrics}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/25 transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Calculator className={`h-4 w-4 ${isCalculatingMetrics ? 'animate-spin' : ''}`} />
            {isCalculatingMetrics ? 'Calculating...' : 'Calculate Metrics'}
          </button>
        }
      />
      <hr className="section-rule" />

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Quick Search Trigger per Active Prompt */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Play className="h-3.5 w-3.5 text-indigo-400" />
          Execute Active Prompts ({activePrompts.length})
        </h3>

        {activePrompts.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-violet-200/15 text-center text-xs text-slate-500">
            No active prompts found for this workspace. Add or activate prompts in the Prompts tab.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activePrompts.map((p) => {
              const isRunning = runningPromptId === p.id;
              return (
                <div
                  key={p.id}
                  className="glass-card p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    {p.category && (
                      <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">
                        {p.category}
                      </span>
                    )}
                    <p className="text-xs font-medium text-slate-200 line-clamp-1">
                      &ldquo;{p.prompt_text}&rdquo;
                    </p>
                  </div>

                  <button
                    onClick={() => handleRunSearch(p.id)}
                    disabled={isRunning}
                    className="btn-primary shrink-0 disabled:opacity-50"
                  >
                    <Play className={`h-3 w-3 fill-current ${isRunning ? 'animate-pulse' : ''}`} />
                    {isRunning ? 'Searching...' : 'Run Gemini Search'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Historical Search Runs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-sky-400" />
            Execution History ({searchRuns.length})
          </h3>
          <button
            onClick={onSearchExecuted}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" /> Refresh Runs
          </button>
        </div>

        {searchRuns.length === 0 ? (
          <div className="glass-card text-center py-10 text-xs text-slate-500">
            No search runs executed yet. Select an active prompt above and click &ldquo;Run Gemini Search&rdquo;.
          </div>
        ) : (
          <div className="space-y-3">
            {searchRuns.map((run) => (
              <SearchRunCard
                key={run.search_run_id}
                run={run}
                onAnalysisSuccess={(res) => {
                  setSelectedAnalysis(res);
                  setIsAnalysisModalOpen(true);
                  onSearchExecuted();
                }}
                onSourcesSuccess={(res) => {
                  setSelectedSources(res);
                  setIsSourcesModalOpen(true);
                  onSearchExecuted();
                }}
                onViewAnalysis={handleViewAnalysis}
                onViewSources={handleViewSources}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnalysisDetailsModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        analysis={selectedAnalysis}
      />

      <SourcesDetailsModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
        sourcesData={selectedSources}
      />
    </div>
  );
}
