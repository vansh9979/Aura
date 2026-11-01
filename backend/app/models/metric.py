"""Metric model storing time-series visibility and sentiment KPIs."""
import uuid
from datetime import date, datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Date, Float, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.project import Project


class Metric(Base):
    """Aggregated AI-search visibility metrics recorded for a project over time."""

    __tablename__ = "metrics"
    __table_args__ = (
        UniqueConstraint("project_id", "metric_date", name="uq_metrics_project_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    metric_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )
    visibility_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    average_position: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    sentiment_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    share_of_voice: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    mention_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="metrics",
    )
