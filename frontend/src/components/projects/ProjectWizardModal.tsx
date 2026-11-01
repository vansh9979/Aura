'use client';

import React, { useState, useEffect } from 'react';
import {
  getCompanies,
  createCompany,
  getBrands,
  createBrand,
  createProject,
} from '@/lib/api/projects';
import type { Company, Brand, Project } from '@/lib/api/types';
import { X, Building, Tag, FolderPlus, ArrowRight, Check, AlertCircle } from 'lucide-react';

interface ProjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export function ProjectWizardModal({
  isOpen,
  onClose,
  onProjectCreated,
}: ProjectWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Existing lists
  const [companies, setCompanies] = useState<Company[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Company Form State
  const [useExistingCompany, setUseExistingCompany] = useState<boolean>(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [newCompanyWebsite, setNewCompanyWebsite] = useState<string>('');

  // Brand Form State
  const [useExistingBrand, setUseExistingBrand] = useState<boolean>(true);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [newBrandName, setNewBrandName] = useState<string>('');
  const [newBrandWebsite, setNewBrandWebsite] = useState<string>('');
  const [newBrandIndustry, setNewBrandIndustry] = useState<string>('');

  // Project Form State
  const [projectName, setProjectName] = useState<string>('');
  const [projectDescription, setProjectDescription] = useState<string>('');

  // Status State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing companies on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      getCompanies()
        .then((compList) => {
          setCompanies(compList);
          if (compList.length > 0) {
            setSelectedCompanyId(compList[0].id);
            setUseExistingCompany(true);
          } else {
            setUseExistingCompany(false);
          }
        })
        .catch(() => setUseExistingCompany(false));
    }
  }, [isOpen]);

  // Load brands when company changes
  useEffect(() => {
    if (selectedCompanyId) {
      getBrands(selectedCompanyId)
        .then((brandList) => {
          setBrands(brandList);
          if (brandList.length > 0) {
            setSelectedBrandId(brandList[0].id);
            setUseExistingBrand(true);
          } else {
            setUseExistingBrand(false);
          }
        })
        .catch(() => {
          setBrands([]);
          setUseExistingBrand(false);
        });
    }
  }, [selectedCompanyId]);

  if (!isOpen) return null;

  const handleNextStep1 = async () => {
    setError(null);
    if (!useExistingCompany) {
      if (!newCompanyName.trim()) {
        setError('Please enter a company name.');
        return;
      }
      setIsLoading(true);
      try {
        const created = await createCompany({
          name: newCompanyName.trim(),
          website: newCompanyWebsite.trim() || undefined,
        });
        setCompanies((prev) => [...prev, created]);
        setSelectedCompanyId(created.id);
        setUseExistingCompany(true);
        setStep(2);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create company.');
        return;
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!selectedCompanyId) {
        setError('Please select a company.');
        return;
      }
      setStep(2);
    }
  };

  const handleNextStep2 = async () => {
    setError(null);
    if (!useExistingBrand) {
      if (!newBrandName.trim()) {
        setError('Please enter a brand name.');
        return;
      }
      setIsLoading(true);
      try {
        const created = await createBrand({
          company_id: selectedCompanyId,
          name: newBrandName.trim(),
          website: newBrandWebsite.trim() || undefined,
          industry: newBrandIndustry.trim() || undefined,
        });
        setBrands((prev) => [...prev, created]);
        setSelectedBrandId(created.id);
        setUseExistingBrand(true);
        setStep(3);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create brand.');
        return;
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!selectedBrandId) {
        setError('Please select a brand.');
        return;
      }
      setStep(3);
    }
  };

  const handleCreateProject = async () => {
    setError(null);
    if (!projectName.trim()) {
      setError('Please enter a project workspace name.');
      return;
    }
    setIsLoading(true);
    try {
      const created = await createProject({
        company_id: selectedCompanyId,
        brand_id: selectedBrandId,
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        status: 'active',
      });
      onProjectCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-scrim">
      <div className="relative w-full max-w-lg glass-card p-6 text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Create Monitoring Workspace</h3>
              <p className="text-xs text-slate-400">Step {step} of 3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 my-4">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-slate-800'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-800'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-indigo-500' : 'bg-slate-800'}`} />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Company */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-200">Organization / Company</span>
              {companies.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setUseExistingCompany(!useExistingCompany);
                    setError(null);
                  }}
                  className="text-indigo-400 hover:underline cursor-pointer"
                >
                  {useExistingCompany ? '+ Create New Company' : 'Select Existing Company'}
                </button>
              )}
            </div>

            {useExistingCompany && companies.length > 0 ? (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Existing Company</label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="field-input"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.website ? `(${c.website})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Company Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corporation"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Website (optional)</label>
                  <input
                    type="url"
                    placeholder="https://acme.com"
                    value={newCompanyWebsite}
                    onChange={(e) => setNewCompanyWebsite(e.target.value)}
                    className="field-input"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNextStep1}
                disabled={isLoading}
                className="btn-primary disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Next: Brand'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Brand */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-200">Monitored Brand</span>
              <button
                type="button"
                onClick={() => {
                  setUseExistingBrand(!useExistingBrand);
                  setError(null);
                }}
                className="text-indigo-400 hover:underline cursor-pointer"
              >
                {useExistingBrand ? '+ Create New Brand' : 'Select Existing Brand'}
              </button>
            </div>

            {useExistingBrand && brands.length > 0 ? (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Brand under Company</label>
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="field-input"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.industry ? `(${b.industry})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Brand Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Pulse"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Brand Website (optional)</label>
                  <input
                    type="url"
                    placeholder="https://pulse.acme.com"
                    value={newBrandWebsite}
                    onChange={(e) => setNewBrandWebsite(e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Industry / Category (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Cloud Security, CRM, Fintech"
                    value={newBrandIndustry}
                    onChange={(e) => setNewBrandIndustry(e.target.value)}
                    className="field-input"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep2}
                disabled={isLoading}
                className="btn-primary disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Next: Workspace'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Project Workspace */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Project Workspace Name *</label>
              <input
                type="text"
                placeholder="e.g. Q4 AI Search Visibility Benchmark"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Description / Objectives (optional)</label>
              <textarea
                rows={3}
                placeholder="Tracking brand presence across Gemini and generative search..."
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="field-input"
              />
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-400">
              <span className="font-semibold text-indigo-300 block mb-1">Workspace Summary:</span>
              <div>Company: {companies.find((c) => c.id === selectedCompanyId)?.name || 'Selected'}</div>
              <div>Brand: {brands.find((b) => b.id === selectedBrandId)?.name || 'Selected'}</div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 cursor-pointer shadow-md"
              >
                <Check className="h-3.5 w-3.5" />
                {isLoading ? 'Creating Workspace...' : 'Launch Project'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
