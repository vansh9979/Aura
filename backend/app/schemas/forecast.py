"""Pydantic schemas for AI Visibility Forecasting and Trend Analysis."""
from __future__ import annotations

import uuid
from datetime import date as dt_date
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class MetricTrendItem(BaseModel):
    """Trend analysis for an individual KPI metric over historical records."""

    first_value: Optional[float] = Field(
        None,
        description="First available historical value for this metric",
    )
    latest_value: Optional[float] = Field(
        None,
        description="Latest recorded value for this metric",
    )
    absolute_change: Optional[float] = Field(
        None,
        description="Absolute change from first to latest value (latest - first)",
    )
    percentage_change: Optional[float] = Field(
        None,
        description="Percentage change from first to latest value relative to baseline",
    )
    direction: Literal["improving", "declining", "stable", "insufficient_data"] = Field(
        ...,
        description="Empirical trend direction: 'improving', 'declining', 'stable', or 'insufficient_data'",
    )


class ProjectTrends(BaseModel):
    """Grouped trends across all primary visibility KPIs."""

    visibility_score: MetricTrendItem
    average_position: MetricTrendItem
    sentiment_score: MetricTrendItem
    share_of_voice: MetricTrendItem


class ForecastPoint(BaseModel):
    """A single forecasted data point for a future date."""

    date: dt_date = Field(..., description="Future date (YYYY-MM-DD) of the forecasted metric")
    predicted_value: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Predicted visibility score clamped to [0.0, 100.0]",
    )


class ProjectForecastResponse(BaseModel):
    """Response payload for the short-term visibility forecast endpoint."""

    project_id: uuid.UUID = Field(..., description="Unique ID of the project")
    forecast_status: Literal["available", "insufficient_data"] = Field(
        ...,
        description="'available' if 3+ historical data points exist; 'insufficient_data' otherwise",
    )
    metric: str = Field(
        default="visibility_score",
        description="Name of the forecasted metric (default: visibility_score)",
    )
    historical_points: int = Field(
        ...,
        ge=0,
        description="Number of historical metric observation dates evaluated",
    )
    trend: ProjectTrends = Field(
        ...,
        description="Calculated historical trend metrics across all primary KPIs",
    )
    forecast: List[ForecastPoint] = Field(
        default_factory=list,
        description="List of daily predicted visibility scores for the next N days",
    )
    confidence: Literal["low", "medium", "high"] = Field(
        ...,
        description="Statistical confidence level based on historical sample size and consistency",
    )
    message: str = Field(
        ...,
        description="Explanatory summary of the forecast and data sufficiency",
    )
