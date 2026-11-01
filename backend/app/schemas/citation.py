"""Pydantic schemas for sources and citations API responses."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SourceRead(BaseModel):
    """Schema representing an external web source referenced by AI."""

    id: uuid.UUID
    url: str
    domain: str
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CitationRead(BaseModel):
    """Schema representing a citation linking an AI response to a web source."""

    id: uuid.UUID
    ai_response_id: uuid.UUID
    source_id: uuid.UUID
    citation_type: Optional[str] = None
    citation_position: Optional[int] = None
    cited_text: Optional[str] = None
    created_at: datetime
    source: Optional[SourceRead] = None

    model_config = {"from_attributes": True}


class SearchRunSourcesResponse(BaseModel):
    """Response model for source and citation extraction on a search run."""

    search_run_id: uuid.UUID
    ai_response_id: uuid.UUID
    sources_count: int = Field(..., description="Total unique sources linked to this response")
    citations_count: int = Field(..., description="Total citations extracted for this response")
    sources: List[SourceRead] = Field(default_factory=list, description="Unique sources referenced")
    citations: List[CitationRead] = Field(default_factory=list, description="Citations linking response to sources")

    model_config = {"from_attributes": True}
