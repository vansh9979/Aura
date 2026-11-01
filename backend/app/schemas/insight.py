"""Pydantic schemas for Root-Cause, Competitor & Source-Gap Intelligence."""
from __future__ import annotations

import uuid
from datetime import date
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class ProjectMetricsSummary(BaseModel):
    """Summary of project visibility KPIs for the evaluated date."""

    visibility_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Percentage of analyzed search responses mentioning the target brand (0-100)",
    )
    average_position: Optional[float] = Field(
        None,
        ge=1.0,
        description="Average primary mention position when brand appeared (>=1.0, null if never mentioned)",
    )
    sentiment_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Average sentiment score towards target brand (0-100, null if never mentioned)",
    )
    share_of_voice: Optional[float] = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Share of voice among all relevant brand entity mentions (0-100)",
    )
    mention_count: int = Field(
        0,
        ge=0,
        description="Total number of target-brand mentions across analyzed responses",
    )


class CompetitorInsight(BaseModel):
    """Aggregated intelligence for a detected competitor entity."""

    name: str = Field(..., description="Canonical name of the competitor brand/product")
    visibility_percentage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Percentage of analyzed responses in which this competitor appeared (0-100)",
    )
    mention_count: int = Field(
        ...,
        ge=0,
        description="Total number of times this competitor was mentioned across responses",
    )
    average_position: Optional[float] = Field(
        None,
        ge=1.0,
        description="Average chronological appearance position in the responses",
    )


class SourceGapInsight(BaseModel):
    """A web source cited in competitor-associated responses with no target-brand coverage."""

    domain: Optional[str] = Field(None, description="Domain hostname of the source")
    url: str = Field(..., description="Canonical URL of the source")
    title: Optional[str] = Field(None, description="Title of the source webpage or document")
    citation_frequency: int = Field(
        ...,
        ge=1,
        description="Number of times this source was cited across competitor responses",
    )
    competitor_association: Optional[str] = Field(
        None,
        description="Comma-separated names of competitors associated with this source",
    )


class TopicGapInsight(BaseModel):
    """A search category/topic where competitors dominate and target brand is weak or absent."""

    category: str = Field(..., description="Prompt category or topic cluster name")
    target_visibility: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Target brand visibility percentage in this category (0-100)",
    )
    strongest_competitor: str = Field(
        ...,
        description="Name of the strongest performing competitor in this category",
    )
    competitor_visibility: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Visibility percentage of the strongest competitor in this category (0-100)",
    )


class RootCauseItem(BaseModel):
    """An evidence-based root cause explaining why visibility is at its current level."""

    type: str = Field(
        ...,
        description=(
            "Root-cause category, e.g. LOW_VISIBILITY, WEAK_COMPETITOR_POSITION, "
            "SOURCE_COVERAGE_GAP, TOPIC_COVERAGE_GAP, LOW_SENTIMENT, "
            "LOW_SHARE_OF_VOICE, WEAK_CITATION_PRESENCE"
        ),
    )
    severity: Literal["high", "medium", "low"] = Field(
        ...,
        description="Severity level of the root cause issue",
    )
    evidence: List[str] = Field(
        default_factory=list,
        description="Specific numerical or empirical facts supporting this cause",
    )
    explanation: str = Field(
        ...,
        description="Clear explanation of how this cause impacts AI search visibility",
    )


class DiagnosisOutput(BaseModel):
    """Structured output expected from the Gemini executive diagnosis generation."""

    diagnosis: str = Field(
        ...,
        description="Concise, actionable executive diagnosis summarizing root causes and priorities",
    )


class ProjectInsightsResponse(BaseModel):
    """Complete root-cause, competitor, and source-gap intelligence report for a project."""

    project_id: uuid.UUID = Field(..., description="Unique ID of the evaluated project")
    brand: str = Field(..., description="Target brand name")
    project_name: str = Field(..., description="Project workspace name")
    metric_date: date = Field(..., description="Evaluated metric date (YYYY-MM-DD)")
    metrics: ProjectMetricsSummary = Field(
        ...,
        description="Authoritative PostgreSQL-derived KPI metrics summary",
    )
    competitors: List[CompetitorInsight] = Field(
        default_factory=list,
        description="Ranked list of competitors detected in analyzed responses",
    )
    source_gaps: List[SourceGapInsight] = Field(
        default_factory=list,
        description="High-value sources citing competitors where target brand is absent",
    )
    topic_gaps: List[TopicGapInsight] = Field(
        default_factory=list,
        description="Search query topics with competitor dominance over target brand",
    )
    root_causes: List[RootCauseItem] = Field(
        default_factory=list,
        description="Identified root causes with numerical evidence",
    )
    diagnosis: str = Field(
        ...,
        description="Concise executive diagnosis synthesizing the evidence and action items",
    )

    model_config = {"from_attributes": True}
