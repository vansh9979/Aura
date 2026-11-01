'use client';

import React, { useState } from 'react';
import { Sidebar, NavSection } from './Sidebar';
import { Header } from './Header';
import { Project, Brand } from '@/lib/api/types';

interface DashboardShellProps {
  projects: Project[];
  selectedProject: Project | null;
  currentBrand: Brand | null;
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onSelectProject: (projectId: string) => void;
  apiConnected: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenProjectWizard?: () => void;
  onCalculateMetrics?: () => void;
  isCalculatingMetrics?: boolean;
  children: (currentSection: NavSection) => React.ReactNode;
}

export function DashboardShell({
  projects,
  selectedProject,
  currentBrand,
  currentSection,
  onSelectSection,
  onSelectProject,
  apiConnected,
  isLoading,
  onRefresh,
  onOpenProjectWizard,
  onCalculateMetrics,
  isCalculatingMetrics,
  children,
}: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [spot, setSpot] = useState({ x: 40, y: 20 });

  const handleSelectSection = (section: NavSection) => {
    onSelectSection(section);
    setMobileNavOpen(false);
  };

  return (
    <div
      className="aurora-scene flex min-h-screen text-slate-100 antialiased selection:bg-violet-500 selection:text-white"
      onMouseMove={(event) => setSpot({ x: event.clientX, y: event.clientY })}
    >
      <div className="aurora-grain" />
      <div className="aurora-spot" style={{ left: spot.x, top: spot.y }} />

      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <Sidebar
        currentSection={currentSection}
        onSelectSection={handleSelectSection}
        mobileOpen={mobileNavOpen}
      />

      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <Header
          projects={projects}
          selectedProject={selectedProject}
          currentBrand={currentBrand}
          onSelectProject={onSelectProject}
          apiConnected={apiConnected}
          isLoading={isLoading}
          onRefresh={onRefresh}
          onOpenProjectWizard={onOpenProjectWizard}
          onCalculateMetrics={onCalculateMetrics}
          isCalculatingMetrics={isCalculatingMetrics}
          onToggleNav={() => setMobileNavOpen((open) => !open)}
        />

        <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto">
          <div key={currentSection} className="page-enter">
            {children(currentSection)}
          </div>
        </main>
      </div>
    </div>
  );
}
