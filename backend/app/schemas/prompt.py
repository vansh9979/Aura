"""Pydantic schemas for Prompt entity."""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PromptBase(BaseModel):
    """Shared prompt properties."""

    prompt_text: str = Field(
        ...,
        min_length=1,
        description="The query/prompt text sent to AI search engines",
        examples=["What are the best electric vehicles in 2024?"],
    )
    category: Optional[str] = Field(
        None,
        max_length=100,
        description="Prompt category (e.g. 'awareness', 'comparison', 'purchase')",
        examples=["awareness"],
    )
    language: str = Field(
        default="en",
        max_length=10,
        description="BCP-47 language code for the prompt",
        examples=["en"],
    )
    region: Optional[str] = Field(
        None,
        max_length=50,
        description="Target region or locale for the prompt",
        examples=["US"],
    )
    is_active: bool = Field(
        default=True,
        description="Whether this prompt is actively used in search runs",
    )


class PromptCreate(PromptBase):
    """Schema for creating a new prompt."""

    project_id: uuid.UUID = Field(
        ...,
        description="ID of the parent project this prompt belongs to",
    )


class PromptUpdate(BaseModel):
    """Schema for partially updating an existing prompt (PATCH)."""

    prompt_text: Optional[str] = Field(
        None,
        min_length=1,
        description="Updated prompt text",
        examples=["Which electric vehicles have the longest range in 2024?"],
    )
    category: Optional[str] = Field(
        None,
        max_length=100,
        description="Updated category",
        examples=["comparison"],
    )
    language: Optional[str] = Field(
        None,
        max_length=10,
        description="Updated BCP-47 language code",
        examples=["en"],
    )
    region: Optional[str] = Field(
        None,
        max_length=50,
        description="Updated target region",
        examples=["UK"],
    )
    is_active: Optional[bool] = Field(
        None,
        description="Toggle active status",
    )


class PromptRead(PromptBase):
    """Schema for returning prompt details."""

    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
