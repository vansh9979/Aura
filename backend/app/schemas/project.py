"""Pydantic schemas for Project entity."""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ProjectBase(BaseModel):
    """Shared project properties."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Project workspace name",
        examples=["Q3 AI Search Visibility Benchmark"],
    )
    description: Optional[str] = Field(
        None,
        description="Project objectives and scope",
        examples=["Tracking brand citations across ChatGPT, Perplexity, and Gemini"],
    )
    status: str = Field(
        default="active",
        max_length=50,
        description="Current operational status of the project",
        examples=["active"],
    )


class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""

    company_id: uuid.UUID = Field(
        ...,
        description="ID of the parent company",
    )
    brand_id: uuid.UUID = Field(
        ...,
        description="ID of the target brand being monitored in this project",
    )


class ProjectRead(ProjectBase):
    """Schema for returning project details."""

    id: uuid.UUID
    company_id: uuid.UUID
    brand_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
