"""Pydantic schemas for Brand entity."""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class BrandBase(BaseModel):
    """Shared brand properties."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Brand name being monitored",
        examples=["Acme Cloud"],
    )
    website: Optional[str] = Field(
        None,
        max_length=512,
        description="Brand website URL",
        examples=["https://cloud.acme.com"],
    )
    description: Optional[str] = Field(
        None,
        description="Detailed description of the brand and its core offerings",
        examples=["Enterprise cloud infrastructure and intelligence solutions"],
    )
    industry: Optional[str] = Field(
        None,
        max_length=100,
        description="Industry or market category",
        examples=["Cloud Computing"],
    )


class BrandCreate(BrandBase):
    """Schema for creating a new brand."""

    company_id: uuid.UUID = Field(
        ...,
        description="ID of the parent company that owns this brand",
    )


class BrandRead(BrandBase):
    """Schema for returning brand details."""

    id: uuid.UUID
    company_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
