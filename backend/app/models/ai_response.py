"""AIResponse model storing generated responses from AI engines."""
import uuid
from datetime import datetime
from typing import Any, Dict, List, TYPE_CHECKING
from sqlalchemy import Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.search_run import SearchRun
    from app.models.entity import Entity
    from app.models.citation import Citation


class AIResponse(Base):
    """Raw AI response text and metadata captured from a search run."""

    __tablename__ = "ai_responses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    search_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("search_runs.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    response_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    response_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default="{}",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    search_run: Mapped["SearchRun"] = relationship(
        "SearchRun",
        back_populates="ai_response",
    )
    entities: Mapped[List["Entity"]] = relationship(
        "Entity",
        back_populates="ai_response",
        cascade="all, delete-orphan",
    )
    citations: Mapped[List["Citation"]] = relationship(
        "Citation",
        back_populates="ai_response",
        cascade="all, delete-orphan",
    )
