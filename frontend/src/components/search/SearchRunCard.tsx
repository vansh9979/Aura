'use client';

import React, { useState } from 'react';
import type {
  SearchRunListItem,
  SearchRunAnalysisResponse,
  SearchRunSourcesResponse,
} from '@/lib/api/types';
import { analyzeSearchRun, extractSources } from '@/lib/api/projects';
import {
  Sparkles,
  Link2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface SearchRunCardProps {
  run: SearchRunListItem;
  onAnalysisSuccess: (analysis: SearchRunAnalysisResponse) => void;
  onSourcesSuccess: (sources: SearchRunSourcesResponse) => void;
  onViewAnalysis: (searchRunId: string) => void;
  onViewSources: (searchRunId: string) => void;
}

export function SearchRunCard({
  run,
  onAnalysisSuccess,
  onSourcesSuccess,
  onViewAnalysis,
  onViewSources,
}: SearchRunCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isExtractingSources, setIsExtractingSources] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Compute execution duration in seconds if timestamps exist
  let durationStr = '';
  if (run.started_at && run.completed_at) {
    const ms = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
    if (ms > 0) {
      durationStr = `${(ms / 1000).toFixed(1)}s`;
    }
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await analyzeSearchRun(run.search_run_id);
      onAnalysisSuccess(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExtractSources = async () => {
    setIsExtractingSources(true);
    setError(null);
    try {
      const res = await extractSources(run.search_run_id);
      onSourcesSuccess(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Source extraction failed.');
    } finally {
      setIsExtractingSources(false);
    }
  };

  // Pipeline stage indicators
  const isSearchComplete = run.status === 'completed';
  const hasAnalysis = run.has_analysis;
  const hasSources = run.has_sources;

  return (
    <div className="glass-card p-5">
      {/* Top Bar: Prompt, Category, Model, Status */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {run.prompt_category && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                {run.prompt_category}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <Cpu className="h-3 w-3 text-slate-500" />
              {run.model || 'Gemini'}
            </span>
            {durationStr && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                <Clock className="h-3 w-3" />
                {durationStr}
              </span>
            )}
          </div>

          <h4 className="text-sm font-semibold text-slate-100 line-clamp-2">
            &ldquo;{run.prompt_text || 'AI Search Execution'}&rdquo;
          </h4>
        </div>

        {/* Status Badge */}
        <div className="shrink-0 self-start sm:self-auto">
          {run.status === 'completed' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed
            </span>
          )}
          {run.status === 'running' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <span className="animate-spin h-2 w-2 rounded-full border border-indigo-400 border-t-transparent" />
              Running...
            </span>
          )}
          {run.status === 'failed' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
              <AlertCircle className="h-3.5 w-3.5" />
              Failed
            </span>
          )}
        </div>
      </div>

      {/* PART 8: Workflow Progression Pipeline */}
      <div className="my-3.5 p-2.5 rounded-lg bg-black/25 border border-white/8 flex items-center justify-between text-[11px] text-slate-400 overflow-x-auto">
        <div className="flex items-center gap-1 font-medium text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>Prompt</span>
        </div>
        <ArrowRight className="h-3 w-3 text-slate-600 shrink-0 mx-1" />

        <div className={`flex items-center gap-1 font-medium ${isSearchComplete ? 'text-emerald-400' : 'text-slate-500'}`}>
          {isSearchComplete ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-slate-600" />}
          <span>Search</span>
        </div>
        <ArrowRight className="h-3 w-3 text-slate-600 shrink-0 mx-1" />

        <div className={`flex items-center gap-1 font-medium ${isSearchComplete ? 'text-emerald-400' : 'text-slate-500'}`}>
          {isSearchComplete ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-slate-600" />}
          <span>Response</span>
        </div>
        <ArrowRight className="h-3 w-3 text-slate-600 shrink-0 mx-1" />

        <div className={`flex items-center gap-1 font-medium ${hasAnalysis ? 'text-emerald-400' : 'text-slate-400'}`}>
          {hasAnalysis ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-amber-400" />}
          <span>Analysis</span>
        </div>
        <ArrowRight className="h-3 w-3 text-slate-600 shrink-0 mx-1" />

        <div className={`flex items-center gap-1 font-medium ${hasSources ? 'text-emerald-400' : 'text-slate-400'}`}>
          {hasSources ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-slate-600" />}
          <span>Sources</span>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Response Preview */}
      {run.response_text && (
        <div className="my-2 text-xs text-slate-300">
          <div
            className={`p-3 rounded-lg bg-black/20 border border-white/8 leading-relaxed font-sans ${
              isExpanded ? '' : 'line-clamp-3'
            }`}
          >
            {run.response_text}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Expand Full AI Response
              </>
            )}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Analyze Response Button */}
          {hasAnalysis ? (
            <button
              onClick={() => onViewAnalysis(run.search_run_id)}
              className="btn-ghost px-3 py-1.5 text-xs text-violet-100"
            >
              <Eye className="h-3.5 w-3.5" />
              View Analysis
            </button>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || run.status !== 'completed'}
              className="btn-primary disabled:opacity-50"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analyzing with Gemini...' : 'Analyze Response'}
            </button>
          )}

          {/* Extract Sources Button */}
          {hasSources ? (
            <button
              onClick={() => onViewSources(run.search_run_id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-colors cursor-pointer"
            >
              <Link2 className="h-3.5 w-3.5" />
              View Grounded Sources
            </button>
          ) : (
            <button
              onClick={handleExtractSources}
              disabled={isExtractingSources || run.status !== 'completed'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Link2 className={`h-3.5 w-3.5 ${isExtractingSources ? 'animate-spin' : ''}`} />
              {isExtractingSources ? 'Extracting...' : 'Extract Sources'}
            </button>
          )}
        </div>

        <span className="text-[10px] text-slate-500 font-mono">
          Run ID: {run.search_run_id.slice(0, 8)}...
        </span>
      </div>
    </div>
  );
}
