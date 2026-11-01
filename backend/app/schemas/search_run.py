"""Pydantic schemas for the search_runs API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SearchRunCreate(BaseModel):
    """Request body for POST /api/v1/search-runs."""

    prompt_id: uuid.UUID = Field(..., description="UUID of an existing prompt to execute")


class SearchRunResponse(BaseModel):
    """Response returned after a search run is created and executed."""

    search_run_id: uuid.UUID = Field(..., description="Unique ID of the created search run")
    status: str = Field(..., description="Final status: 'completed' or 'failed'")
    engine: str = Field(..., description="AI engine used, e.g. 'gemini'")
    model: Optional[str] = Field(None, description="Model identifier used for the run")
    response: Optional[str] = Field(None, description="AI-generated response text")
    error: Optional[str] = Field(None, description="Error message if the run failed")
    started_at: Optional[datetime] = Field(None)
    completed_at: Optional[datetime] = Field(None)

    model_config = {"from_attributes": True}


class SearchRunListItem(BaseModel):
    """Schema representing an enriched search run item in project lists."""

    search_run_id: uuid.UUID
    prompt_id: uuid.UUID
    project_id: uuid.UUID
    prompt_text: Optional[str] = None
    prompt_category: Optional[str] = None
    status: str
    engine: str
    model: Optional[str] = None
    response_text: Optional[str] = None
    has_analysis: bool = False
    has_sources: bool = False
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None

    model_config = {"from_attributes": True}

