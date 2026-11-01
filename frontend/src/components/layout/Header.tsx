'use client';

import React from 'react';
import { Project, Brand } from '@/lib/api/types';
import {
  Layers,
  Building,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Calculator,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  projects: Project[];
  selectedProject: Project | null;
  currentBrand: Brand | null;
  onSelectProject: (projectId: string) => void;
  apiConnected: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenProjectWizard?: () => void;
  onCalculateMetrics?: () => void;
  isCalculatingMetrics?: boolean;
  onToggleNav?: () => void;
}

export function Header({
  projects,
  selectedProject,
  currentBrand,
  onSelectProject,
  apiConnected,
  isLoading,
  onRefresh,
  onOpenProjectWizard,
  onCalculateMetrics,
  isCalculatingMetrics,
  onToggleNav,
}: HeaderProps) {
  return (
    <header className="h-16 border-b border-violet-200/10 bg-[#0b0918]/55 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleNav && (
          <button
            onClick={onToggleNav}
            className="btn-ghost h-9 w-9 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <Layers className="h-4 w-4 text-violet-300 shrink-0 hidden sm:block" />
          <div className="relative">
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-[#120f22] border border-violet-200/15 hover:border-violet-300/30 text-slate-100 text-xs sm:text-sm font-medium rounded-xl px-3 py-1.5 pr-8 appearance-none focus:outline-hidden focus:ring-2 focus:ring-violet-500/40 cursor-pointer transition-colors max-w-[150px] sm:max-w-[260px] truncate"
            >
              {projects.length === 0 && (
                <option value="">No projects available</option>
              )}
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {onOpenProjectWizard && (
          <button
            onClick={onOpenProjectWizard}
            title="Create New Monitoring Project"
            className="btn-ghost h-9 w-9 shrink-0"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {currentBrand && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-400/20 text-xs text-violet-100">
            <Building className="h-3.5 w-3.5 text-cyan-300" />
            <span className="text-slate-400 font-normal">Brand</span>
            <span className="font-semibold truncate max-w-[120px]">
              {currentBrand.name}
            </span>
            {currentBrand.industry && (
              <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                {currentBrand.industry}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {onCalculateMetrics && (
          <button
            onClick={onCalculateMetrics}
            disabled={isCalculatingMetrics || !selectedProject}
            title="Recalculate AI Search Visibility Metrics"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/25 transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
          >
            <Calculator className={`h-3.5 w-3.5 ${isCalculatingMetrics ? 'animate-spin' : ''}`} />
            <span>{isCalculatingMetrics ? 'Calculating...' : 'Calculate Metrics'}</span>
          </button>
        )}

        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
            apiConnected
              ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {apiConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="hidden lg:inline">API Connected</span>
              <Wifi className="h-3 w-3 lg:hidden" />
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <span className="hidden lg:inline">API Disconnected</span>
              <WifiOff className="h-3 w-3 lg:hidden" />
            </>
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh Dashboard Data"
          className="btn-ghost h-9 w-9 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-violet-300' : ''}`} />
        </button>
      </div>
    </header>
  );
}
