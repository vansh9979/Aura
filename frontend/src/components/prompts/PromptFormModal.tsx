'use client';

import React, { useState, useEffect } from 'react';
import { createPrompt, updatePrompt } from '@/lib/api/projects';
import type { Prompt } from '@/lib/api/types';
import { X, FileQuestion, Check, AlertCircle } from 'lucide-react';

interface PromptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  initialPrompt?: Prompt | null;
  onPromptSaved: (prompt: Prompt) => void;
}

const DEFAULT_CATEGORIES = [
  'awareness',
  'comparison',
  'purchase',
  'feature',
  'alternative',
  'review',
];

export function PromptFormModal({
  isOpen,
  onClose,
  projectId,
  initialPrompt,
  onPromptSaved,
}: PromptFormModalProps) {
  const [promptText, setPromptText] = useState<string>('');
  const [category, setCategory] = useState<string>('awareness');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [language, setLanguage] = useState<string>('en');
  const [region, setRegion] = useState<string>('US');
  const [isActive, setIsActive] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialPrompt) {
        setPromptText(initialPrompt.prompt_text);
        if (initialPrompt.category && DEFAULT_CATEGORIES.includes(initialPrompt.category)) {
          setCategory(initialPrompt.category);
          setCustomCategory('');
        } else if (initialPrompt.category) {
          setCategory('custom');
          setCustomCategory(initialPrompt.category);
        } else {
          setCategory('awareness');
          setCustomCategory('');
        }
        setLanguage(initialPrompt.language || 'en');
        setRegion(initialPrompt.region || 'US');
        setIsActive(initialPrompt.is_active ?? true);
      } else {
        setPromptText('');
        setCategory('awareness');
        setCustomCategory('');
        setLanguage('en');
        setRegion('US');
        setIsActive(true);
      }
    }
  }, [isOpen, initialPrompt]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!promptText.trim()) {
      setError('Please provide the prompt or query text.');
      return;
    }

    const resolvedCategory = category === 'custom' ? customCategory.trim() || undefined : category;

    setIsLoading(true);
    try {
      if (initialPrompt) {
        const updated = await updatePrompt(initialPrompt.id, {
          prompt_text: promptText.trim(),
          category: resolvedCategory,
          language: language.trim() || 'en',
          region: region.trim() || undefined,
          is_active: isActive,
        });
        onPromptSaved(updated);
      } else {
        const created = await createPrompt({
          project_id: projectId,
          prompt_text: promptText.trim(),
          category: resolvedCategory,
          language: language.trim() || 'en',
          region: region.trim() || undefined,
          is_active: isActive,
        });
        onPromptSaved(created);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-scrim">
      <div className="relative w-full max-w-lg glass-card p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileQuestion className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {initialPrompt ? 'Edit Search Prompt' : 'Create Search Prompt'}
              </h3>
              <p className="text-xs text-slate-400">Configure query sent to AI engines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="my-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Search Prompt / Query Text *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. What are the best enterprise marketing automation tools in 2026?"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="field-input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="field-input capitalize"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="custom">Custom Category...</option>
              </select>
            </div>

            {category === 'custom' ? (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Custom Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. pricing, roadmap"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="field-input"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Region</label>
                <input
                  type="text"
                  placeholder="US, EU, Global"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="field-input"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Language Code</label>
              <input
                type="text"
                placeholder="en"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="field-input"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="is_active_toggle"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="is_active_toggle" className="text-xs text-slate-300 font-medium cursor-pointer">
                Active for search runs
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {isLoading ? 'Saving...' : initialPrompt ? 'Save Changes' : 'Create Prompt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
