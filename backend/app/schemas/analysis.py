"""Pydantic schemas for the AI response intelligence analysis API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.services.ai.response_analyzer import TargetBrandAnalysis


class EntityRead(BaseModel):
    """Schema representing an extracted entity record stored in the database."""

    id: uuid.UUID
    ai_response_id: uuid.UUID
    entity_name: str
    entity_type: Optional[str] = None
    is_target_brand: bool
    mention_position: Optional[int] = None
    context_text: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchRunAnalysisResponse(BaseModel):
    """Response returned when an AI response is analyzed."""

    search_run_id: uuid.UUID = Field(..., description="Unique ID of the analyzed search run")
    ai_response_id: uuid.UUID = Field(..., description="Unique ID of the associated AI response")
    target_brand: str = Field(..., description="Name of the target brand derived from project relationship")
    target_brand_analysis: TargetBrandAnalysis = Field(..., description="Target brand detection & sentiment")
    entities_count: int = Field(..., description="Total number of entities stored")
    entities: List[EntityRead] = Field(..., description="List of detected entities stored in the DB")
    response_metadata: Dict[str, Any] = Field(..., description="Updated AI response metadata with analysis")

    model_config = {"from_attributes": True}
