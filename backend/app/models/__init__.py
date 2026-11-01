"""Models package exporting DeclarativeBase and all 12 platform domain models."""
from app.models.base import Base, TimestampMixin
from app.models.user import User
from app.models.company import Company
from app.models.brand import Brand
from app.models.project import Project
from app.models.prompt import Prompt
from app.models.search_run import SearchRun
from app.models.ai_response import AIResponse
from app.models.entity import Entity
from app.models.source import Source
from app.models.citation import Citation
from app.models.metric import Metric
from app.models.recommendation import Recommendation

__all__ = [
    "Base",
    "TimestampMixin",
    "User",
    "Company",
    "Brand",
    "Project",
    "Prompt",
    "SearchRun",
    "AIResponse",
    "Entity",
    "Source",
    "Citation",
    "Metric",
    "Recommendation",
]
