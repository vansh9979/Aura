"""Company model representing client organizations and accounts."""
import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.brand import Brand
    from app.models.project import Project


class Company(Base, TimestampMixin):
    """Organization / account entity managing multiple users, brands, and projects."""

    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    website: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
    )

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User",
        back_populates="company",
    )
    brands: Mapped[List["Brand"]] = relationship(
        "Brand",
        back_populates="company",
        cascade="all, delete-orphan",
    )
    projects: Mapped[List["Project"]] = relationship(
        "Project",
        back_populates="company",
        cascade="all, delete-orphan",
    )
