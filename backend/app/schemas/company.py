"""Pydantic schemas for Company entity."""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CompanyBase(BaseModel):
    """Shared company properties."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Name of the organization/company",
        examples=["Acme Corp"],
    )
    website: Optional[str] = Field(
        None,
        max_length=512,
        description="Primary website URL",
        examples=["https://acme.com"],
    )


class CompanyCreate(CompanyBase):
    """Schema for creating a new company."""
    pass


class CompanyRead(CompanyBase):
    """Schema for returning company details."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
