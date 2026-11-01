"""Citation model connecting AI responses to referenced web sources."""
import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.ai_response import AIResponse
    from app.models.source import Source


class Citation(Base):
    """Link between an AI response and the web source cited within it."""

    __tablename__ = "citations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    ai_response_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_responses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    citation_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    citation_position: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    cited_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    ai_response: Mapped["AIResponse"] = relationship(
        "AIResponse",
        back_populates="citations",
    )
    source: Mapped["Source"] = relationship(
        "Source",
        back_populates="citations",
    )
