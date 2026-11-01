"""Services package for external integrations and business logic."""
from app.services.metrics_service import calculate_project_metrics, get_historical_metrics
from app.services.insights_service import get_project_insights
from app.services.forecasting_service import (
    calculate_project_trends,
    generate_visibility_forecast,
)
from app.services.recommendation_service import (
    generate_project_recommendations,
    get_project_recommendations,
)

__all__ = [
    "calculate_project_metrics",
    "get_historical_metrics",
    "get_project_insights",
    "calculate_project_trends",
    "generate_visibility_forecast",
    "generate_project_recommendations",
    "get_project_recommendations",
]
