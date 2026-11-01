"""Project API endpoints for creating and retrieving monitoring projects."""
import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.company import Company
from app.models.brand import Brand
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectRead
from app.schemas.metric import (
    MetricRead,
    MetricCalculateRequest,
    MetricCalculateResponse,
)
from app.schemas.insight import ProjectInsightsResponse
from app.schemas.forecast import ProjectForecastResponse
from app.schemas.recommendation import RecommendationRead
from app.services.metrics_service import (
    calculate_project_metrics,
    get_historical_metrics,
)
from app.services.insights_service import get_project_insights
from app.services.forecasting_service import generate_visibility_forecast
from app.services.recommendation_service import (
    generate_project_recommendations,
    get_project_recommendations,
)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post(
    "",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create Project",
    description="Create a new AI search monitoring workspace for a company and brand.",
)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
) -> ProjectRead:
    """Create a new project linked to a company and brand."""
    # 1. Verify company exists
    company = db.get(Company, payload.company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with id '{payload.company_id}' not found",
        )

    # 2. Verify brand exists
    brand = db.get(Brand, payload.brand_id)
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand with id '{payload.brand_id}' not found",
        )

    # 3. Verify brand belongs to the company
    if brand.company_id != payload.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Brand '{payload.brand_id}' does not belong to company '{payload.company_id}'",
        )

    project = Project(
        company_id=payload.company_id,
        brand_id=payload.brand_id,
        name=payload.name,
        description=payload.description,
        status=payload.status,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get(
    "",
    response_model=List[ProjectRead],
    status_code=status.HTTP_200_OK,
    summary="List Projects",
    description="Retrieve all projects ordered by creation date descending.",
)
def list_projects(
    db: Session = Depends(get_db),
) -> List[ProjectRead]:
    """Retrieve all projects for workspace switching."""
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return projects


@router.get(
    "/{project_id}",
    response_model=ProjectRead,
    status_code=status.HTTP_200_OK,
    summary="Get Project",
    description="Retrieve project workspace details by unique UUID.",
)
def get_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ProjectRead:
    """Retrieve a project by its ID."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id '{project_id}' not found",
        )
    return project


@router.post(
    "/{project_id}/metrics/calculate",
    response_model=MetricCalculateResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate Project Metrics",
    description=(
        "Calculate or recalculate project-level AI search visibility metrics "
        "based on stored and analyzed search responses for a specific date (or all available dates)."
    ),
)
def calculate_metrics(
    project_id: uuid.UUID,
    metric_date: Optional[date] = Query(
        None,
        description="Optional target date (YYYY-MM-DD) to calculate metrics for. Defaults to all available analyzed dates.",
    ),
    payload: Optional[MetricCalculateRequest] = None,
    db: Session = Depends(get_db),
) -> MetricCalculateResponse:
    """Calculate and store daily AI search visibility metrics."""
    target_d = (payload.metric_date if payload and payload.metric_date else None) or metric_date
    metric_record = calculate_project_metrics(
        db=db,
        project_id=project_id,
        target_date=target_d,
    )
    return MetricCalculateResponse.model_validate(metric_record)


@router.get(
    "/{project_id}/metrics",
    response_model=List[MetricRead],
    status_code=status.HTTP_200_OK,
    summary="Get Historical Project Metrics",
    description="Retrieve historical daily metrics for a project ordered by metric_date descending.",
)
def get_project_metrics(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> List[MetricRead]:
    """Retrieve historical daily metrics ordered by metric_date descending."""
    metrics = get_historical_metrics(db=db, project_id=project_id)
    return [MetricRead.model_validate(m) for m in metrics]


@router.get(
    "/{project_id}/insights",
    response_model=ProjectInsightsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Project Insights & Root Causes",
    description=(
        "Retrieve root-cause, competitor, and source-gap intelligence for a project. "
        "Deterministically computes competitor performance, source coverage gaps, "
        "topic gaps, and evidence-backed root causes, synthesized with an executive diagnosis."
    ),
)
def get_insights(
    project_id: uuid.UUID,
    metric_date: Optional[date] = Query(
        None,
        description="Optional metric date (YYYY-MM-DD) to retrieve insights for. Defaults to latest available date.",
    ),
    db: Session = Depends(get_db),
) -> ProjectInsightsResponse:
    """Retrieve evidence-based insights, competitor landscape, source gaps, and diagnosis."""
    return get_project_insights(
        db=db,
        project_id=project_id,
        metric_date=metric_date,
    )


@router.get(
    "/{project_id}/forecast",
    response_model=ProjectForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Short-Term Visibility Forecast",
    description=(
        "Retrieve transparent, deterministic linear regression visibility forecast for the next N days "
        "(1 to 30 days). Returns 'insufficient_data' if fewer than 3 historical points exist."
    ),
)
def get_forecast(
    project_id: uuid.UUID,
    days: int = Query(7, ge=1, le=30, description="Number of future days to forecast (1 to 30, default: 7)"),
    db: Session = Depends(get_db),
) -> ProjectForecastResponse:
    """Generate deterministic short-term visibility forecast."""
    return generate_visibility_forecast(
        db=db,
        project_id=project_id,
        days=days,
    )


@router.post(
    "/{project_id}/recommendations/generate",
    response_model=List[RecommendationRead],
    status_code=status.HTTP_200_OK,
    summary="Generate Intelligent Recommendations",
    description=(
        "Generate evidence-based prioritized recommendations using Step 9 intelligence "
        "and a single structured Gemini synthesis call. Stores and updates open recommendations in PostgreSQL."
    ),
)
def generate_recommendations(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> List[RecommendationRead]:
    """Generate and store actionable optimization recommendations."""
    recs = generate_project_recommendations(
        db=db,
        project_id=project_id,
    )
    return [RecommendationRead.model_validate(r) for r in recs]


@router.get(
    "/{project_id}/recommendations",
    response_model=List[RecommendationRead],
    status_code=status.HTTP_200_OK,
    summary="Get Project Recommendations",
    description="Retrieve stored recommendations for a project ordered by priority (high -> medium -> low) and newest first.",
)
def get_recommendations(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> List[RecommendationRead]:
    """Retrieve stored optimization recommendations."""
    recs = get_project_recommendations(
        db=db,
        project_id=project_id,
    )
    return [RecommendationRead.model_validate(r) for r in recs]
