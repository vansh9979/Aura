"""Schemas package exposing Pydantic models for request validation and response serialization."""
from app.schemas.company import CompanyBase, CompanyCreate, CompanyRead
from app.schemas.brand import BrandBase, BrandCreate, BrandRead
from app.schemas.project import ProjectBase, ProjectCreate, ProjectRead
from app.schemas.prompt import PromptBase, PromptCreate, PromptUpdate, PromptRead
from app.schemas.search_run import SearchRunCreate, SearchRunResponse
from app.schemas.analysis import EntityRead, SearchRunAnalysisResponse
from app.schemas.citation import SourceRead, CitationRead, SearchRunSourcesResponse
from app.schemas.metric import (
    MetricBase,
    MetricRead,
    MetricCalculateRequest,
    MetricCalculateResponse,
)
from app.schemas.insight import (
    CompetitorInsight,
    SourceGapInsight,
    TopicGapInsight,
    RootCauseItem,
    ProjectMetricsSummary,
    ProjectInsightsResponse,
)
from app.schemas.forecast import (
    MetricTrendItem,
    ProjectTrends,
    ForecastPoint,
    ProjectForecastResponse,
)
from app.schemas.recommendation import (
    RecommendationEvidence,
    RecommendationItem,
    GeminiRecommendationsOutput,
    RecommendationRead,
)

__all__ = [
    "CompanyBase",
    "CompanyCreate",
    "CompanyRead",
    "BrandBase",
    "BrandCreate",
    "BrandRead",
    "ProjectBase",
    "ProjectCreate",
    "ProjectRead",
    "PromptBase",
    "PromptCreate",
    "PromptUpdate",
    "PromptRead",
    "SearchRunCreate",
    "SearchRunResponse",
    "EntityRead",
    "SearchRunAnalysisResponse",
    "SourceRead",
    "CitationRead",
    "SearchRunSourcesResponse",
    "MetricBase",
    "MetricRead",
    "MetricCalculateRequest",
    "MetricCalculateResponse",
    "CompetitorInsight",
    "SourceGapInsight",
    "TopicGapInsight",
    "RootCauseItem",
    "ProjectMetricsSummary",
    "ProjectInsightsResponse",
    "MetricTrendItem",
    "ProjectTrends",
    "ForecastPoint",
    "ProjectForecastResponse",
    "RecommendationEvidence",
    "RecommendationItem",
    "GeminiRecommendationsOutput",
    "RecommendationRead",
]
