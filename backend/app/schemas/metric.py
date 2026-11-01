"""Pydantic schemas for AI Search Visibility Metrics."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class MetricBase(BaseModel):
    """Base metrics fields shared across read and response schemas."""

    project_id: uuid.UUID = Field(..., description="Unique ID of the project")
    metric_date: date = Field(..., description="Date of the calculated metrics (YYYY-MM-DD)")
    visibility_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Percentage of analyzed search responses where target brand was mentioned (0-100)",
    )
    average_position: Optional[float] = Field(
        None,
        ge=1.0,
        description="Average primary mention position of the target brand across responses where mentioned (>=1.0)",
    )
    sentiment_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Average sentiment score towards target brand across responses where mentioned (0-100)",
    )
    share_of_voice: Optional[float] = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Percentage of brand entity mentions belonging to target brand (0-100)",
    )
    mention_count: int = Field(
        0,
        ge=0,
        description="Total number of target-brand mentions across analyzed responses on this date",
    )


class MetricRead(MetricBase):
    """Schema representing a stored Metric database record."""

    id: uuid.UUID = Field(..., description="Unique ID of the metric record")
    created_at: datetime = Field(..., description="Timestamp when the metric record was created")

    model_config = {"from_attributes": True}


class MetricCalculateRequest(BaseModel):
    """Optional payload for requesting metrics calculation."""

    metric_date: Optional[date] = Field(
        None,
        description="Optional date (YYYY-MM-DD) to calculate metrics for. If omitted, calculates for all available analyzed dates.",
    )


class MetricCalculateResponse(MetricBase):
    """Response returned after calculating or recalculating project metrics."""

    id: Optional[uuid.UUID] = Field(None, description="Unique ID of the metric record")
    created_at: Optional[datetime] = Field(None, description="Timestamp when the metric record was created")

    model_config = {"from_attributes": True}
