"""Project model representing distinct monitoring/analysis projects."""
import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.brand import Brand
    from app.models.prompt import Prompt
    from app.models.search_run import SearchRun
    from app.models.metric import Metric
    from app.models.recommendation import Recommendation


class Project(Base, TimestampMixin):
    """Separate AI-search monitoring and intelligence workspace."""

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    brand_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",
        index=True,
    )

    # Relationships
    company: Mapped["Company"] = relationship(
        "Company",
        back_populates="projects",
    )
    brand: Mapped["Brand"] = relationship(
        "Brand",
        back_populates="projects",
    )
    prompts: Mapped[List["Prompt"]] = relationship(
        "Prompt",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    search_runs: Mapped[List["SearchRun"]] = relationship(
        "SearchRun",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    metrics: Mapped[List["Metric"]] = relationship(
        "Metric",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    recommendations: Mapped[List["Recommendation"]] = relationship(
        "Recommendation",
        back_populates="project",
        cascade="all, delete-orphan",
    )
