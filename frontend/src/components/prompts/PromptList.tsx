'use client';

import React, { useState } from 'react';
import { Prompt } from '@/lib/api/types';
import { updatePrompt, deletePrompt } from '@/lib/api/projects';
import { SectionHeading } from '@/components/common/SectionHeading';
import {
  FileQuestion,
  Plus,
  Edit2,
  Trash2,
  Play,
  Globe,
  Tag,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface PromptListProps {
  prompts: Prompt[];
  onOpenCreateModal: () => void;
  onEditPrompt: (prompt: Prompt) => void;
  onPromptUpdated: (prompt: Prompt) => void;
  onPromptDeleted: (promptId: string) => void;
  onRunSearch?: (prompt: Prompt) => void;
}

export function PromptList({
  prompts,
  onOpenCreateModal,
  onEditPrompt,
  onPromptUpdated,
  onPromptDeleted,
  onRunSearch,
}: PromptListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleActive = async (prompt: Prompt) => {
    setTogglingId(prompt.id);
    try {
      const updated = await updatePrompt(prompt.id, {
        is_active: !prompt.is_active,
      });
      onPromptUpdated(updated);
    } catch (err) {
      console.error('Failed to toggle prompt status:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (promptId: string) => {
    setIsDeleting(true);
    try {
      await deletePrompt(promptId);
      onPromptDeleted(promptId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete prompt:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Search Prompts"
        description="Target prompts and queries evaluated against AI search engines"
        action={
          <button onClick={onOpenCreateModal} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Search Prompt
          </button>
        }
      />
      <hr className="section-rule" />

      {prompts.length === 0 ? (
        <div className="glass-card text-center py-12">
          <FileQuestion className="h-8 w-8 text-violet-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-200">No Prompts Configured</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Add prompts to benchmark your brand citations and monitor AI search engine visibility.
          </p>
          <button onClick={onOpenCreateModal} className="btn-primary">
            <Plus className="h-3.5 w-3.5" />
            Create First Prompt
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map((prompt) => {
            const isConfirmingDelete = deleteConfirmId === prompt.id;

            return (
              <div
                key={prompt.id}
                className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {prompt.category && (
                      <span className="chip text-violet-200">
                        <Tag className="h-2.5 w-2.5" />
                        {prompt.category}
                      </span>
                    )}
                    <span className="chip text-slate-300">
                      <Globe className="h-2.5 w-2.5" />
                      {prompt.language.toUpperCase()}
                      {prompt.region ? ` (${prompt.region})` : ''}
                    </span>
                    <button
                      onClick={() => handleToggleActive(prompt)}
                      disabled={togglingId === prompt.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                        prompt.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {prompt.is_active ? (
                        <>
                          <CheckCircle2 className="h-2.5 w-2.5" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-2.5 w-2.5" /> Inactive
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-sm font-medium text-slate-100 leading-snug">
                    &ldquo;{prompt.prompt_text}&rdquo;
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  {onRunSearch && prompt.is_active && (
                    <button
                      onClick={() => onRunSearch(prompt)}
                      className="btn-primary"
                      title="Run Search via Gemini"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Run Search
                    </button>
                  )}

                  <button
                    onClick={() => onEditPrompt(prompt)}
                    className="btn-ghost h-8 w-8"
                    title="Edit Prompt"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1.5 bg-rose-950/40 p-1 rounded-lg border border-rose-900/60">
                      <span className="text-[10px] text-rose-300 px-1">Delete?</span>
                      <button
                        onClick={() => handleDelete(prompt.id)}
                        disabled={isDeleting}
                        className="px-2 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded cursor-pointer"
                      >
                        {isDeleting ? '...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 text-[10px] bg-slate-800 text-slate-300 rounded cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(prompt.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete Prompt"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
