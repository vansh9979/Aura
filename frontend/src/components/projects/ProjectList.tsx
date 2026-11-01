'use client';

import React from 'react';
import { Project } from '@/lib/api/types';
import { FolderKanban, Plus, Calendar, ArrowRight } from 'lucide-react';
import { SectionHeading } from '@/components/common/SectionHeading';

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onOpenCreateModal: () => void;
}

export function ProjectList({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenCreateModal,
}: ProjectListProps) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Monitoring Workspaces"
        description="Manage your AI Search Intelligence projects and benchmark workspaces"
        action={
          <button onClick={onOpenCreateModal} className="btn-primary">
            <Plus className="h-4 w-4" />
            Create New Project
          </button>
        }
      />
      <hr className="section-rule" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((proj) => {
          const isSelected = proj.id === selectedProjectId;
          const formattedDate = new Date(proj.created_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          return (
            <button
              key={proj.id}
              type="button"
              onClick={() => onSelectProject(proj.id)}
              className={`glass-card p-5 text-left flex flex-col justify-between ${
                isSelected ? 'border-violet-400/45 shadow-[0_0_28px_rgba(124,58,237,0.18)]' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="icon-well h-9 w-9 text-violet-200">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">{proj.name}</h3>
                  </div>
                  <span
                    className={`chip ${
                      proj.status === 'active' ? 'text-emerald-200 border-emerald-400/30' : 'text-slate-400'
                    }`}
                  >
                    {proj.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                  {proj.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-white/8 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formattedDate}
                </span>
                {isSelected ? (
                  <span className="text-cyan-300 font-semibold">Active Workspace</span>
                ) : (
                  <span className="text-slate-300 flex items-center gap-1">
                    Select <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
