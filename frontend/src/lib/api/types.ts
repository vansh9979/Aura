/**
 * TypeScript interfaces matching backend FastAPI / Pydantic schemas.
 */

export interface Company {
  id: string;
  name: string;
  website?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyCreate {
  name: string;
  website?: string | null;
}

export interface Brand {
  id: string;
  company_id: string;
  name: string;
  website?: string | null;
  description?: string | null;
  industry?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandCreate {
  company_id: string;
  name: string;
  website?: string | null;
  description?: string | null;
  industry?: string | null;
}

export interface Project {
  id: string;
  company_id: string;
  brand_id: string;
  name: string;
  description?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  company_id: string;
  brand_id: string;
  name: string;
  description?: string | null;
  status?: string;
}

export interface Prompt {
  id: string;
  project_id: string;
  prompt_text: string;
  category?: string | null;
  language: string;
  region?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptCreate {
  project_id: string;
  prompt_text: string;
  category?: string | null;
  language?: string;
  region?: string | null;
  is_active?: boolean;
}

export interface PromptUpdate {
  prompt_text?: string;
  category?: string | null;
  language?: string;
  region?: string | null;
  is_active?: boolean;
}

export interface SearchRunListItem {
  search_run_id: string;
  prompt_id: string;
  project_id: string;
  prompt_text?: string | null;
  prompt_category?: string | null;
  status: string;
  engine: string;
  model?: string | null;
  response_text?: string | null;
  has_analysis: boolean;
  has_sources: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
}

export interface SearchRunResponse {
  search_run_id: string;
  status: string;
  engine: string;
  model?: string | null;
  response?: string | null;
  error?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface EntityRead {
  id: string;
  ai_response_id: string;
  entity_name: string;
  entity_type: string;
  is_target_brand: boolean;
  mention_position?: number | null;
  context_text?: string | null;
  created_at: string;
}

export interface TargetBrandAnalysis {
  mentioned: boolean;
  mention_count: number;
  positions: number[];
  overall_sentiment: string;
  sentiment_score: number;
  context_snippets: string[];
}

export interface SearchRunAnalysisResponse {
  search_run_id: string;
  ai_response_id: string;
  target_brand: string;
  target_brand_analysis: TargetBrandAnalysis;
  entities_count: number;
  entities: EntityRead[];
  response_metadata?: Record<string, unknown> | null;
}

export interface SourceRead {
  id: string;
  url: string;
  domain: string;
  title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CitationRead {
  id: string;
  ai_response_id: string;
  source_id: string;
  citation_type?: string | null;
  citation_position?: number | null;
  cited_text?: string | null;
  created_at: string;
  source?: SourceRead | null;
}

export interface SearchRunSourcesResponse {
  search_run_id: string;
  ai_response_id: string;
  sources_count: number;
  citations_count: number;
  sources: SourceRead[];
  citations: CitationRead[];
}

export interface Metric {
  id: string;
  project_id: string;
  metric_date: string;
  visibility_score: number;
  average_position: number | null;
  sentiment_score: number | null;
  share_of_voice: number;
  mention_count: number;
  created_at: string;
}

export interface MetricCalculateResponse {
  id: string;
  project_id: string;
  metric_date: string;
  visibility_score: number;
  average_position: number | null;
  sentiment_score: number | null;
  share_of_voice: number;
  mention_count: number;
  created_at: string;
}

export interface RootCause {
  type: string;
  severity: 'high' | 'medium' | 'low' | string;
  evidence: string[];
  explanation: string;
}

export interface CompetitorItem {
  name: string;
  visibility_percentage: number;
  mention_count: number;
  average_position?: number | null;
}

export interface SourceGap {
  domain: string;
  competitor_citations: number;
  target_citations: number;
  citation_gap: number;
  status?: string;
}

export interface TopicGap {
  category: string;
  target_visibility: number;
  strongest_competitor: string;
  competitor_visibility: number;
}

export interface InsightsResponse {
  project_id: string;
  brand: string;
  project_name: string;
  metric_date: string;
  metrics?: Record<string, unknown>;
  competitors: CompetitorItem[];
  source_gaps: SourceGap[];
  topic_gaps: TopicGap[];
  root_causes: RootCause[];
  diagnosis: string;
}

export interface TrendMetricSummary {
  first_value: number;
  latest_value: number;
  absolute_change: number;
  percentage_change: number;
  direction: 'improving' | 'declining' | 'stable' | string;
}

export interface ForecastPoint {
  date: string;
  predicted_value: number;
}

export interface ForecastResponse {
  project_id: string;
  forecast_status: string;
  metric: string;
  historical_points: number;
  trend?: {
    visibility_score?: TrendMetricSummary;
    average_position?: TrendMetricSummary;
    sentiment_score?: TrendMetricSummary;
    share_of_voice?: TrendMetricSummary;
  };
  forecast: ForecastPoint[];
  confidence: 'high' | 'medium' | 'low' | string;
  message: string;
}

export interface Recommendation {
  id: string;
  project_id: string;
  title: string;
  description: string;
  recommendation_type: string;
  priority: 'high' | 'medium' | 'low' | string;
  evidence?: Record<string, unknown>;
  status: 'open' | 'in_progress' | 'implemented' | 'dismissed' | string;
  created_at: string;
  updated_at: string;
}

export interface HealthCheckResponse {
  status: string;
  message: string;
  service: string;
  version: string;
}
