import { apiClient } from './client';
import type {
  HealthCheckResponse,
  Company,
  CompanyCreate,
  Brand,
  BrandCreate,
  Project,
  ProjectCreate,
  Prompt,
  PromptCreate,
  PromptUpdate,
  SearchRunListItem,
  SearchRunResponse,
  SearchRunAnalysisResponse,
  SearchRunSourcesResponse,
  Metric,
  MetricCalculateResponse,
  InsightsResponse,
  ForecastResponse,
  Recommendation,
} from './types';

// ── Health ──────────────────────────────────────────────────────────────────
export async function checkBackendHealth(): Promise<HealthCheckResponse> {
  return apiClient<HealthCheckResponse>('/api/v1/health');
}

// ── Companies ───────────────────────────────────────────────────────────────
export async function getCompanies(): Promise<Company[]> {
  return apiClient<Company[]>('/api/v1/companies');
}

export async function createCompany(data: CompanyCreate): Promise<Company> {
  return apiClient<Company>('/api/v1/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Brands ──────────────────────────────────────────────────────────────────
export async function getBrands(companyId?: string): Promise<Brand[]> {
  const query = companyId ? `?company_id=${companyId}` : '';
  return apiClient<Brand[]>(`/api/v1/brands${query}`);
}

export async function getBrand(brandId: string): Promise<Brand> {
  return apiClient<Brand>(`/api/v1/brands/${brandId}`);
}

export async function createBrand(data: BrandCreate): Promise<Brand> {
  return apiClient<Brand>('/api/v1/brands', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Projects ────────────────────────────────────────────────────────────────
export async function getProjects(): Promise<Project[]> {
  return apiClient<Project[]>('/api/v1/projects');
}

export async function getProject(projectId: string): Promise<Project> {
  return apiClient<Project>(`/api/v1/projects/${projectId}`);
}

export async function createProject(data: ProjectCreate): Promise<Project> {
  return apiClient<Project>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Prompts ─────────────────────────────────────────────────────────────────
export async function getProjectPrompts(projectId: string): Promise<Prompt[]> {
  return apiClient<Prompt[]>(`/api/v1/projects/${projectId}/prompts`);
}

export async function createPrompt(data: PromptCreate): Promise<Prompt> {
  return apiClient<Prompt>('/api/v1/prompts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePrompt(
  promptId: string,
  data: PromptUpdate
): Promise<Prompt> {
  return apiClient<Prompt>(`/api/v1/prompts/${promptId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deletePrompt(promptId: string): Promise<void> {
  return apiClient<void>(`/api/v1/prompts/${promptId}`, {
    method: 'DELETE',
  });
}

// ── Search Runs ─────────────────────────────────────────────────────────────
export async function getProjectSearchRuns(
  projectId: string
): Promise<SearchRunListItem[]> {
  return apiClient<SearchRunListItem[]>(`/api/v1/projects/${projectId}/search-runs`);
}

export async function runSearch(promptId: string): Promise<SearchRunResponse> {
  return apiClient<SearchRunResponse>('/api/v1/search-runs', {
    method: 'POST',
    body: JSON.stringify({ prompt_id: promptId }),
  });
}

export async function analyzeSearchRun(
  searchRunId: string
): Promise<SearchRunAnalysisResponse> {
  return apiClient<SearchRunAnalysisResponse>(
    `/api/v1/search-runs/${searchRunId}/analyze`,
    { method: 'POST' }
  );
}

export async function extractSources(
  searchRunId: string
): Promise<SearchRunSourcesResponse> {
  return apiClient<SearchRunSourcesResponse>(
    `/api/v1/search-runs/${searchRunId}/extract-sources`,
    { method: 'POST' }
  );
}

// ── Metrics ─────────────────────────────────────────────────────────────────
export async function getProjectMetrics(projectId: string): Promise<Metric[]> {
  return apiClient<Metric[]>(`/api/v1/projects/${projectId}/metrics`);
}

export async function calculateProjectMetrics(
  projectId: string,
  metricDate?: string
): Promise<MetricCalculateResponse> {
  const query = metricDate ? `?metric_date=${metricDate}` : '';
  return apiClient<MetricCalculateResponse>(
    `/api/v1/projects/${projectId}/metrics/calculate${query}`,
    { method: 'POST' }
  );
}

// ── Insights & Forecast ─────────────────────────────────────────────────────
export async function getProjectInsights(
  projectId: string,
  metricDate?: string
): Promise<InsightsResponse> {
  const query = metricDate ? `?metric_date=${metricDate}` : '';
  return apiClient<InsightsResponse>(`/api/v1/projects/${projectId}/insights${query}`);
}

export async function getProjectForecast(
  projectId: string,
  days = 7
): Promise<ForecastResponse> {
  return apiClient<ForecastResponse>(`/api/v1/projects/${projectId}/forecast?days=${days}`);
}

// ── Recommendations ─────────────────────────────────────────────────────────
export async function getProjectRecommendations(
  projectId: string
): Promise<Recommendation[]> {
  return apiClient<Recommendation[]>(`/api/v1/projects/${projectId}/recommendations`);
}

export async function generateProjectRecommendations(
  projectId: string
): Promise<Recommendation[]> {
  return apiClient<Recommendation[]>(
    `/api/v1/projects/${projectId}/recommendations/generate`,
    { method: 'POST' }
  );
}
