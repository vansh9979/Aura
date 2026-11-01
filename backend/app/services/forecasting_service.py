"""Forecasting and trend analysis service for AI search visibility KPIs."""
from __future__ import annotations

import logging
import uuid
from datetime import date, timedelta
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.metric import Metric
from app.models.project import Project
from app.schemas.forecast import (
    ForecastPoint,
    MetricTrendItem,
    ProjectForecastResponse,
    ProjectTrends,
)

logger = logging.getLogger(__name__)


def calculate_project_trends(metrics: List[Metric]) -> ProjectTrends:
    """Calculate historical trend metrics across all primary KPIs.

    Args:
        metrics: Chronologically sorted list of Metric records (metric_date ASC).

    Returns:
        ProjectTrends object containing trend direction and deltas for all 4 KPIs.
    """
    return ProjectTrends(
        visibility_score=_compute_metric_trend(metrics, "visibility_score", lower_is_better=False),
        average_position=_compute_metric_trend(metrics, "average_position", lower_is_better=True),
        sentiment_score=_compute_metric_trend(metrics, "sentiment_score", lower_is_better=False),
        share_of_voice=_compute_metric_trend(metrics, "share_of_voice", lower_is_better=False),
    )


def _compute_metric_trend(
    metrics: List[Metric],
    attribute_name: str,
    lower_is_better: bool = False,
) -> MetricTrendItem:
    """Helper to compute trend for a single numerical metric attribute."""
    valid_values = [
        getattr(m, attribute_name)
        for m in metrics
        if getattr(m, attribute_name) is not None
    ]

    if not valid_values:
        return MetricTrendItem(
            first_value=None,
            latest_value=None,
            absolute_change=None,
            percentage_change=None,
            direction="insufficient_data",
        )

    first_val = float(valid_values[0])
    latest_val = float(valid_values[-1])

    if len(valid_values) == 1:
        return MetricTrendItem(
            first_value=round(first_val, 2),
            latest_value=round(latest_val, 2),
            absolute_change=0.0,
            percentage_change=0.0,
            direction="stable",
        )

    abs_change = round(latest_val - first_val, 2)
    if first_val != 0.0:
        pct_change = round((abs_change / abs(first_val)) * 100.0, 2)
    else:
        pct_change = round(abs_change * 100.0, 2) if abs_change != 0 else 0.0

    # Direction evaluation (threshold: 0.5 for scores, 0.1 for position)
    delta_threshold = 0.1 if lower_is_better else 0.5

    if lower_is_better:
        # Lower position number (e.g. 1.0 vs 3.0) represents an improvement
        if abs_change < -delta_threshold:
            direction = "improving"
        elif abs_change > delta_threshold:
            direction = "declining"
        else:
            direction = "stable"
    else:
        # Higher score (e.g. 80% vs 50%) represents an improvement
        if abs_change > delta_threshold:
            direction = "improving"
        elif abs_change < -delta_threshold:
            direction = "declining"
        else:
            direction = "stable"

    return MetricTrendItem(
        first_value=round(first_val, 2),
        latest_value=round(latest_val, 2),
        absolute_change=abs_change,
        percentage_change=pct_change,
        direction=direction,
    )


def generate_visibility_forecast(
    db: Session,
    project_id: uuid.UUID,
    days: int = 7,
) -> ProjectForecastResponse:
    """Generate deterministic linear regression visibility forecast for future days.

    Args:
        db: Active SQLAlchemy database session.
        project_id: UUID of the project.
        days: Number of future days to forecast (1 to 30).

    Returns:
        ProjectForecastResponse containing trend calculations and forecasted points,
        or an explicit 'insufficient_data' status if fewer than 3 points exist.
    """
    # ── 1. Validate project existence ──────────────────────────────────────
    project: Optional[Project] = db.get(Project, project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id '{project_id}' not found.",
        )

    # ── 2. Retrieve chronological historical metrics ───────────────────────
    metrics: List[Metric] = (
        db.query(Metric)
        .filter(Metric.project_id == project_id)
        .order_by(Metric.metric_date.asc())
        .all()
    )

    trends = calculate_project_trends(metrics)

    # Filter to records with non-null visibility_score
    valid_points = [m for m in metrics if m.visibility_score is not None]
    n_points = len(valid_points)

    # ── 3. Insufficient Data Guard (< 3 historical points) ─────────────────
    if n_points < 3:
        return ProjectForecastResponse(
            project_id=project_id,
            forecast_status="insufficient_data",
            metric="visibility_score",
            historical_points=n_points,
            trend=trends,
            forecast=[],
            confidence="low",
            message=(
                f"Insufficient historical data: {n_points} observation(s) found. "
                "At least 3 distinct historical daily metric records are required to generate an empirical forecast."
            ),
        )

    # ── 4. Deterministic Ordinary Least Squares Linear Regression ──────────
    base_date = valid_points[0].metric_date
    x_vals = [(m.metric_date - base_date).days for m in valid_points]
    y_vals = [float(m.visibility_score) for m in valid_points]

    mean_x = sum(x_vals) / n_points
    mean_y = sum(y_vals) / n_points

    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_vals, y_vals))
    denominator = sum((x - mean_x) ** 2 for x in x_vals)

    if denominator != 0:
        slope = numerator / denominator
        intercept = mean_y - slope * mean_x
    else:
        slope = 0.0
        intercept = mean_y

    # Assign conservative statistical confidence based on observations count
    if n_points >= 10:
        confidence = "high"
    elif n_points >= 5:
        confidence = "medium"
    else:
        confidence = "low"

    # ── 5. Project next N days of visibility scores ────────────────────────
    latest_date = valid_points[-1].metric_date
    forecast_points: List[ForecastPoint] = []

    for i in range(1, days + 1):
        target_forecast_date = latest_date + timedelta(days=i)
        target_x = (target_forecast_date - base_date).days
        predicted_raw = slope * target_x + intercept

        # Clamp predictions strictly to [0.0, 100.0]
        clamped_prediction = max(0.0, min(100.0, round(predicted_raw, 2)))
        forecast_points.append(
            ForecastPoint(
                date=target_forecast_date,
                predicted_value=clamped_prediction,
            )
        )

    trend_dir = trends.visibility_score.direction
    return ProjectForecastResponse(
        project_id=project_id,
        forecast_status="available",
        metric="visibility_score",
        historical_points=n_points,
        trend=trends,
        forecast=forecast_points,
        confidence=confidence,
        message=(
            f"Forecast successfully computed using linear regression across {n_points} historical observations. "
            f"Current visibility trend is {trend_dir} with {confidence} statistical confidence."
        ),
    )
