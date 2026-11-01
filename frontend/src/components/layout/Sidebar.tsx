'use client';

import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  FileQuestion,
  Search,
  Sparkles,
  Link2,
  TrendingUp,
  Lightbulb,
  Cpu,
} from 'lucide-react';

export type NavSection =
  | 'dashboard'
  | 'projects'
  | 'prompts'
  | 'searches'
  | 'insights'
  | 'sources'
  | 'forecast'
  | 'recommendations';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  mobileOpen?: boolean;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'prompts', label: 'Prompts', icon: FileQuestion },
  { id: 'searches', label: 'AI Searches', icon: Search },
  { id: 'insights', label: 'Insights', icon: Sparkles },
  { id: 'sources', label: 'Sources', icon: Link2 },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
];

export function Sidebar({ currentSection, onSelectSection, mobileOpen }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-violet-200/10 bg-[#0b0918]/80 backdrop-blur-xl flex flex-col h-screen transition-transform duration-300 lg:sticky lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="h-16 flex items-center gap-3 px-5 border-b border-violet-200/10">
        <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center text-white shadow-[0_0_24px_rgba(167,139,250,0.55)]">
          <Cpu className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan-300 pulse-ring" />
        </div>
        <div>
          <span className="font-display font-extrabold tracking-tight text-lg text-white">AURA</span>
          <span className="block text-[10px] uppercase font-semibold tracking-[0.18em] text-cyan-300/90">
            Search Intelligence
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        <div className="px-3 pb-3 text-[10px] font-semibold tracking-[0.2em] text-violet-200/50 uppercase">
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`nav-pill w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'is-active'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? 'text-cyan-300' : 'text-slate-500'
                }`}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <span className="orbit-dot" />}
            </button>
          );
        })}
      </nav>

      <div className="m-3 p-4 rounded-2xl border border-violet-200/10 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/5 to-cyan-500/10 text-xs text-slate-400 overflow-hidden relative">
        <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-cyan-400/10 blur-xl" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.18em] text-violet-200/70 mb-3">Live stack</div>
          <div className="flex items-center justify-between text-[11px]">
            <span>AI Engine</span>
            <span className="text-emerald-300 font-semibold">Google Gemini</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-2">
            <span>Grounding</span>
            <span className="text-cyan-200/80">Google Search</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
