'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  checkBackendHealth,
  getProjects,
  getBrand,
  getProjectPrompts,
  getProjectSearchRuns,
  getProjectMetrics,
  getProjectInsights,
  getProjectForecast,
  getProjectRecommendations,
  generateProjectRecommendations,
  calculateProjectMetrics,
} from '@/lib/api/projects';
import type {
  Project,
  Brand,
  Metric,
  Prompt,
  SearchRunListItem,
  InsightsResponse,
  ForecastResponse,
  Recommendation,
} from '@/lib/api/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { NavSection } from '@/components/layout/Sidebar';
import { MetricsGrid } from '@/components/metrics/MetricsGrid';
import { VisibilityChart } from '@/components/dashboard/VisibilityChart';
import { SentimentChart } from '@/components/dashboard/SentimentChart';
import { ShareOfVoice } from '@/components/dashboard/ShareOfVoice';
import { CompetitorChart } from '@/components/dashboard/CompetitorChart';
import { ForecastChart } from '@/components/dashboard/ForecastChart';
import { RootCauses } from '@/components/dashboard/RootCauses';
import { SourceGaps } from '@/components/dashboard/SourceGaps';
import { Recommendations } from '@/components/dashboard/Recommendations';
import { ProjectWizardModal } from '@/components/projects/ProjectWizardModal';
import { ProjectList } from '@/components/projects/ProjectList';
import { PromptList } from '@/components/prompts/PromptList';
import { PromptFormModal } from '@/components/prompts/PromptFormModal';
import { SearchRunList } from '@/components/search/SearchRunList';
import {
  DashboardContentSkeleton,
  Skeleton,
} from '@/components/common/LoadingSkeleton';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { SectionHeading } from '@/components/common/SectionHeading';
import {
  FolderKanban,
  Sparkles,
  Link2,
  Activity,
  CalendarDays,
} from 'lucide-react';

export default function DashboardPage() {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [searchRuns, setSearchRuns] = useState<SearchRunListItem[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Modals state
  const [isProjectWizardOpen, setIsProjectWizardOpen] = useState<boolean>(false);
  const [isPromptFormOpen, setIsPromptFormOpen] = useState<boolean>(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  // Status & Feedback State
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState<boolean>(false);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Initialize backend connection & projects
  const initializeDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      await checkBackendHealth();
      setApiConnected(true);

      const projectList = await getProjects();
      setProjects(projectList);

      if (projectList.length > 0) {
        setSelectedProjectId((prev) => prev || projectList[0].id);
      }
    } catch (err: unknown) {
      setApiConnected(false);
      setError('Could not connect to FastAPI backend at NEXT_PUBLIC_API_URL');
      setErrorDetails(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  // Load project-specific data (prompts, runs, metrics, insights, forecast, recs)
  const loadProjectData = useCallback(async (projectId: string) => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const proj = projects.find((p) => p.id === projectId);
      if (proj && proj.brand_id) {
        try {
          const brandData = await getBrand(proj.brand_id);
          setCurrentBrand(brandData);
        } catch {
          setCurrentBrand(null);
        }
      }

      // Concurrently fetch all project resources
      const [
        promptsRes,
        runsRes,
        metricsRes,
        insightsRes,
        forecastRes,
        recsRes,
      ] = await Promise.allSettled([
        getProjectPrompts(projectId),
        getProjectSearchRuns(projectId),
        getProjectMetrics(projectId),
        getProjectInsights(projectId),
        getProjectForecast(projectId, 7),
        getProjectRecommendations(projectId),
      ]);

      if (promptsRes.status === 'fulfilled') {
        setPrompts(promptsRes.value);
      } else {
        setPrompts([]);
      }

      if (runsRes.status === 'fulfilled') {
        setSearchRuns(runsRes.value);
      } else {
        setSearchRuns([]);
      }

      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value);
      } else {
        setMetrics([]);
      }

      if (insightsRes.status === 'fulfilled') {
        setInsights(insightsRes.value);
      } else {
        setInsights(null);
      }

      if (forecastRes.status === 'fulfilled') {
        setForecast(forecastRes.value);
      } else {
        setForecast(null);
      }

      if (recsRes.status === 'fulfilled') {
        setRecommendations(recsRes.value);
      } else {
        setRecommendations([]);
      }

      setApiConnected(true);
    } catch (err: unknown) {
      setError('Failed to load project workspace intelligence.');
      setErrorDetails(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [projects]);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectData(selectedProjectId);
    }
  }, [selectedProjectId, loadProjectData]);

  // Metrics Calculation Workflow Trigger
  const handleCalculateMetrics = async () => {
    if (!selectedProjectId) return;
    setIsCalculatingMetrics(true);
    try {
      await calculateProjectMetrics(selectedProjectId);
      setNotification({
        message: 'Daily AI Visibility metrics successfully computed from analyzed search runs!',
        type: 'success',
      });
      // Refresh dashboard metrics without page reload
      await loadProjectData(selectedProjectId);
    } catch (err) {
      setNotification({
        message: err instanceof Error ? err.message : 'Metric calculation failed.',
        type: 'error',
      });
    } finally {
      setIsCalculatingMetrics(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Recommendations Synthesis Trigger
  const handleGenerateRecommendations = async () => {
    if (!selectedProjectId) return;
    setIsGeneratingRecs(true);
    try {
      const newRecs = await generateProjectRecommendations(selectedProjectId);
      setRecommendations(newRecs);
      setNotification({
        message: 'New optimization recommendations successfully synthesized by Gemini!',
        type: 'success',
      });
    } catch (err: unknown) {
      setNotification({
        message: err instanceof Error ? err.message : 'Recommendation generation failed.',
        type: 'error',
      });
    } finally {
      setIsGeneratingRecs(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Callback when a new project is created via wizard
  const handleProjectCreated = (newProj: Project) => {
    setProjects((prev) => [newProj, ...prev]);
    setSelectedProjectId(newProj.id);
    setCurrentSection('dashboard');
    setNotification({
      message: `Workspace "${newProj.name}" created and activated!`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) || null;
  const latestMetric = metrics.length > 0 ? metrics[0] : null;
  const previousMetric = metrics.length > 1 ? metrics[1] : null;

  return (
    <DashboardShell
      projects={projects}
      selectedProject={selectedProject}
      currentBrand={currentBrand}
      currentSection={currentSection}
      onSelectSection={setCurrentSection}
      onSelectProject={(id) => setSelectedProjectId(id)}
      apiConnected={apiConnected}
      isLoading={isLoading}
      onRefresh={() => {
        if (selectedProjectId) {
          loadProjectData(selectedProjectId);
        } else {
          initializeDashboard();
        }
      }}
      onOpenProjectWizard={() => setIsProjectWizardOpen(true)}
      onCalculateMetrics={handleCalculateMetrics}
      isCalculatingMetrics={isCalculatingMetrics}
    >
      {(activeSection: NavSection) => {
        // Notification banner
        const notificationBanner = notification && (
          <div
            className={`toast-enter glass-card p-3.5 text-xs font-semibold flex items-center justify-between mb-4 ${
              notification.type === 'success'
                ? 'border-emerald-400/30 text-emerald-200'
                : 'border-rose-400/30 text-rose-200'
            }`}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="btn-ghost h-7 w-7 text-slate-300"
            >
              ✕
            </button>
          </div>
        );

        // Backend Error State
        if (error) {
          return (
            <ErrorAlert
              title="Backend Request Notice"
              message={error}
              details={errorDetails || undefined}
              onRetry={() => {
                if (selectedProjectId) {
                  loadProjectData(selectedProjectId);
                } else {
                  initializeDashboard();
                }
              }}
            />
          );
        }

        // Loading Skeleton State
        if (isLoading && !selectedProject) {
          return <DashboardContentSkeleton />;
        }

        // Empty Projects State
        if (projects.length === 0 && !isLoading) {
          return (
            <div>
              {notificationBanner}
              <EmptyState
                title="No Monitoring Projects Found"
                description="There are currently no workspaces configured. Use the wizard to set up your organization, brand, and benchmark project."
                icon={<FolderKanban className="h-6 w-6" />}
                actionText="Create First Project"
                onAction={() => setIsProjectWizardOpen(true)}
              />
              <ProjectWizardModal
                isOpen={isProjectWizardOpen}
                onClose={() => setIsProjectWizardOpen(false)}
                onProjectCreated={handleProjectCreated}
              />
            </div>
          );
        }

        // Section Routing
        switch (activeSection) {
          case 'projects':
            return (
              <div className="space-y-6">
                {notificationBanner}
                <ProjectList
                  projects={projects}
                  selectedProjectId={selectedProjectId}
                  onSelectProject={(id) => {
                    setSelectedProjectId(id);
                    setCurrentSection('dashboard');
                  }}
                  onOpenCreateModal={() => setIsProjectWizardOpen(true)}
                />
                <ProjectWizardModal
                  isOpen={isProjectWizardOpen}
                  onClose={() => setIsProjectWizardOpen(false)}
                  onProjectCreated={handleProjectCreated}
                />
              </div>
            );

          case 'prompts':
            return (
              <div className="space-y-6">
                {notificationBanner}
                <PromptList
                  prompts={prompts}
                  onOpenCreateModal={() => {
                    setEditingPrompt(null);
                    setIsPromptFormOpen(true);
                  }}
                  onEditPrompt={(prompt) => {
                    setEditingPrompt(prompt);
                    setIsPromptFormOpen(true);
                  }}
                  onPromptUpdated={(updated) => {
                    setPrompts((prev) =>
                      prev.map((p) => (p.id === updated.id ? updated : p))
                    );
                  }}
                  onPromptDeleted={(deletedId) => {
                    setPrompts((prev) => prev.filter((p) => p.id !== deletedId));
                  }}
                  onRunSearch={(prompt) => {
                    setCurrentSection('searches');
                  }}
                />
                <PromptFormModal
                  isOpen={isPromptFormOpen}
                  onClose={() => setIsPromptFormOpen(false)}
                  projectId={selectedProjectId}
                  initialPrompt={editingPrompt}
                  onPromptSaved={(saved) => {
                    setPrompts((prev) => {
                      const exists = prev.some((p) => p.id === saved.id);
                      if (exists) {
                        return prev.map((p) => (p.id === saved.id ? saved : p));
                      }
                      return [...prev, saved];
                    });
                  }}
                />
              </div>
            );

          case 'searches':
            return (
              <div className="space-y-6">
                {notificationBanner}
                <SearchRunList
                  prompts={prompts}
                  searchRuns={searchRuns}
                  projectId={selectedProjectId}
                  onSearchExecuted={() => {
                    getProjectSearchRuns(selectedProjectId).then(setSearchRuns);
                  }}
                  onCalculateMetrics={handleCalculateMetrics}
                  isCalculatingMetrics={isCalculatingMetrics}
                />
              </div>
            );

          case 'insights':
            return (
              <div className="space-y-6">
                {notificationBanner}
                <SectionHeading
                  title="Root-Cause & Competitive Intelligence"
                  description={`Detailed breakdown of why ${currentBrand?.name || 'the brand'} holds its current visibility`}
                />
                {insights ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RootCauses
                      rootCauses={insights.root_causes}
                      diagnosis={insights.diagnosis}
                    />
                    <CompetitorChart
                      competitors={insights.competitors || []}
                      targetBrand={currentBrand?.name}
                      latestMetric={latestMetric}
                    />
                  </div>
                ) : (
                  <EmptyState
                    title="No Insights Available"
                    description="Run an AI search query and execute response analysis to compute root-cause and competitive landscape data."
                    icon={<Sparkles className="h-6 w-6" />}
                    actionText="Run AI Search"
                    onAction={() => setCurrentSection('searches')}
                  />
                )}
              </div>
            );

          case 'sources':
            return (
              <div className="space-y-6">
                {notificationBanner}
                <SectionHeading
                  title="Source & Citation Intelligence"
                  description="Google Search grounding source domains and citation authority gaps"
                />
                {insights && insights.source_gaps && insights.source_gaps.length > 0 ? (
                  <SourceGaps
                    sourceGaps={insights.source_gaps}
                    targetBrand={currentBrand?.name}
                  />
                ) : (
                  <EmptyState
                    title="No Source Data Available"
                    description="Source intelligence will appear here after AI searches extract citations with Google Search grounding."
                    icon={<Link2 className="h-6 w-6" />}
                    actionText="Execute Grounded Search"
                    onAction={() => setCurrentSection('searches')}
                  />
                )}
              </div>
            );

          case 'forecast':
            return (
              <div className="space-y-6">
                {notificationBanner}
                <SectionHeading
                  title="AI Visibility Forecast"
                  description="Transparent regression modeling based on historical AI visibility"
                />
                <ForecastChart
                  forecast={forecast}
                  historicalMetrics={metrics}
                />
              </div>
            );

          case 'recommendations':
            return (
              <div className="space-y-6">
                {notificationBanner}
                <SectionHeading
                  title="Optimization Recommendations"
                  description="Actionable strategies prioritized by expected visibility impact"
                />
                <Recommendations
                  recommendations={recommendations}
                  onGenerate={handleGenerateRecommendations}
                  isGenerating={isGeneratingRecs}
                />
              </div>
            );

          case 'dashboard':
          default:
            return (
              <div className="space-y-6">
                {notificationBanner}

                <div className="glass-card p-6 overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_90%_10%,rgba(34,211,238,0.12),transparent_36%)]" />
                  <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                    <div>
                      <div className="chip text-cyan-200 mb-3">
                        <Activity className="h-3 w-3" />
                        Live command center
                      </div>
                      <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                        {selectedProject?.name || 'AI Search Intelligence Overview'}
                      </h1>
                      <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                        Monitoring {currentBrand?.name ? <strong className="text-slate-200">{currentBrand.name}</strong> : 'brand'}{' '}
                        presence across generative search engines, citations, and competitive share of voice.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="chip text-violet-200">
                        {prompts.length} prompts
                      </span>
                      <span className="chip text-cyan-200">
                        {searchRuns.length} search runs
                      </span>
                      <span className="chip text-emerald-200">
                        {recommendations.length} recommendations
                      </span>
                      {latestMetric && (
                        <span className="chip text-slate-200">
                          <CalendarDays className="h-3 w-3" />
                          {latestMetric.metric_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1. TOP: KPI cards */}
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <MetricsGrid
                    latestMetric={latestMetric}
                    previousMetric={previousMetric}
                  />
                )}

                {/* Empty Metrics Notice if 0 metrics */}
                {!isLoading && !latestMetric && (
                  <EmptyState
                    title="No Metrics Calculated Yet"
                    description="This project currently has no daily visibility scores. Execute AI search runs and click 'Calculate Metrics' to populate historical analytics."
                    actionText="Execute AI Searches"
                    onAction={() => setCurrentSection('searches')}
                  />
                )}

                {/* 2. SECOND: Visibility Trend + Sentiment Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <VisibilityChart metrics={metrics} />
                  <SentimentChart metrics={metrics} />
                </div>

                {/* 3. THIRD: Competitor Comparison + Share of Voice */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CompetitorChart
                    competitors={insights?.competitors || []}
                    targetBrand={currentBrand?.name}
                    latestMetric={latestMetric}
                  />
                  <ShareOfVoice
                    shareOfVoice={latestMetric?.share_of_voice ?? 0}
                    brandName={currentBrand?.name}
                  />
                </div>

                {/* 4. FOURTH: Forecast */}
                <div>
                  <ForecastChart
                    forecast={forecast}
                    historicalMetrics={metrics}
                  />
                </div>

                {/* 5. FIFTH: Root Causes + Source Gaps */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RootCauses
                    rootCauses={insights?.root_causes || []}
                    diagnosis={insights?.diagnosis}
                  />
                  <SourceGaps
                    sourceGaps={insights?.source_gaps || []}
                    targetBrand={currentBrand?.name}
                  />
                </div>

                {/* 6. BOTTOM: Recommendations */}
                <div>
                  <Recommendations
                    recommendations={recommendations}
                    onGenerate={handleGenerateRecommendations}
                    isGenerating={isGeneratingRecs}
                  />
                </div>

                {/* Project Creation Wizard Modal */}
                <ProjectWizardModal
                  isOpen={isProjectWizardOpen}
                  onClose={() => setIsProjectWizardOpen(false)}
                  onProjectCreated={handleProjectCreated}
                />
              </div>
            );
        }
      }}
    </DashboardShell>
  );
}
