"""Pydantic schemas for Intelligent Recommendations."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class RecommendationEvidence(BaseModel):
    """Structured evidence linking a recommendation to empirical search intelligence."""

    metric: Optional[str] = Field(None, description="Primary metric or gap associated with the recommendation")
    value: Optional[Any] = Field(None, description="Numerical or categorical value supporting the recommendation")
    reason: Optional[str] = Field(None, description="Specific factual reason derived from analysis")


class RecommendationItem(BaseModel):
    """Structured recommendation item produced by the recommendation synthesis."""

    title: str = Field(..., description="Concise, actionable recommendation title")
    description: str = Field(..., description="Detailed, specific tactical action plan")
    recommendation_type: Literal["content", "source", "reputation", "topic", "competitor"] = Field(
        ...,
        description="Category: 'content', 'source', 'reputation', 'topic', or 'competitor'",
    )
    priority: Literal["high", "medium", "low"] = Field(
        ...,
        description="Priority level based on potential visibility impact",
    )
    evidence: Dict[str, Any] = Field(
        default_factory=dict,
        description="Structured empirical facts backing this recommendation",
    )


class GeminiRecommendationsOutput(BaseModel):
    """Schema for structured JSON response from Gemini recommendation generation."""

    recommendations: List[RecommendationItem] = Field(
        ...,
        description="Top 3 to 5 evidence-based prioritized recommendations",
    )


class RecommendationRead(BaseModel):
    """Schema representing a stored Recommendation record from PostgreSQL."""

    id: uuid.UUID = Field(..., description="Unique ID of the recommendation")
    project_id: uuid.UUID = Field(..., description="Unique ID of the associated project")
    title: str = Field(..., description="Title of the recommendation")
    description: str = Field(..., description="Detailed description of the recommended action")
    recommendation_type: Optional[str] = Field(None, description="Recommendation category")
    priority: str = Field(..., description="Priority: high, medium, or low")
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Structured evidence payload")
    status: str = Field(default="open", description="Lifecycle status: open, in_progress, completed, dismissed")
    created_at: datetime = Field(..., description="Timestamp when created")
    updated_at: Optional[datetime] = Field(None, description="Timestamp when last updated")

    model_config = {"from_attributes": True}
