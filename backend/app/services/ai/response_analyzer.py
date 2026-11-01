"""AI Response Intelligence Analyzer service.

Uses the official google-genai SDK to analyze stored AI responses for:
- Target brand detection
- Competitor and alternative entity identification
- Mention positions and context excerpts
- Brand-specific sentiment label and score (0-100)
"""
from __future__ import annotations

import json
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.ai.gemini_service import _get_client, GeminiConfigurationError


class TargetBrandAnalysis(BaseModel):
    """Analysis specific to the target brand within the response."""

    mentioned: bool = Field(
        ...,
        description="True if the target brand is explicitly mentioned in the response text.",
    )
    mention_count: int = Field(
        ...,
        ge=0,
        description="Number of times the target brand is mentioned. 0 if not mentioned.",
    )
    positions: List[int] = Field(
        default_factory=list,
        description=(
            "1-indexed sequence positions of when the target brand appears relative to "
            "all detected entities. Empty list if not mentioned."
        ),
    )
    overall_sentiment: Literal["positive", "neutral", "negative"] = Field(
        ...,
        description="Overall sentiment towards the target brand: 'positive', 'neutral', or 'negative'.",
    )
    sentiment_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Sentiment score from 0 (extremely negative) to 50 (neutral) to 100 (extremely positive).",
    )


class DetectedEntity(BaseModel):
    """Brand, company, or competitor entity extracted from the AI response."""

    name: str = Field(
        ...,
        description="Canonical name of the entity or brand.",
    )
    type: str = Field(
        default="brand",
        description="Entity type: 'brand', 'company', or 'product'.",
    )
    is_target_brand: bool = Field(
        ...,
        description="True if this entity is the target brand; False if it is a competitor or other entity.",
    )
    mention_position: int = Field(
        ...,
        ge=1,
        description="1-indexed chronological position of appearance in the response text.",
    )
    context: str = Field(
        ...,
        description="Surrounding sentence or concise context describing how the entity is mentioned.",
    )


class AIResponseAnalysisResult(BaseModel):
    """Complete structured analysis of an AI response."""

    target_brand: TargetBrandAnalysis = Field(
        ...,
        description="Target brand presence, mention stats, and sentiment analysis.",
    )
    entities: List[DetectedEntity] = Field(
        default_factory=list,
        description=(
            "List of unique meaningful brands, companies, and relevant competitors detected in the response, "
            "ordered by mention_position."
        ),
    )


class AnalysisExecutionError(Exception):
    """Raised when the Gemini analysis call fails or returns an invalid payload."""


def analyze_response(response_text: str, target_brand_name: str) -> AIResponseAnalysisResult:
    """Analyze an AI response text against a target brand using Gemini structured JSON.

    Args:
        response_text: Raw text of the AI response to evaluate.
        target_brand_name: Name of the brand to monitor.

    Returns:
        AIResponseAnalysisResult with target brand sentiment and detected entities.

    Raises:
        GeminiConfigurationError: If API key is missing or client cannot be built.
        AnalysisExecutionError: If Gemini fails to execute or parse the analysis.
    """
    client = _get_client()
    model = settings.GEMINI_MODEL

    prompt = f"""You are an expert AI search intelligence analyst.
Analyze the following AI generated response to assess brand visibility and sentiment for the TARGET BRAND: "{target_brand_name}".

INSTRUCTIONS:
1. Target Brand Detection:
   - Check if "{target_brand_name}" is mentioned in the response text.
   - Count the number of mentions (`mention_count`).
   - Determine its `positions` in the order of entities mentioned (1-indexed). If not mentioned, return an empty list.
   - Evaluate sentiment specifically toward "{target_brand_name}":
     - `overall_sentiment`: "positive", "neutral", or "negative"
     - `sentiment_score`: 0 to 100 (0 = extremely negative, 50 = neutral, 100 = extremely positive).
     - If the target brand is not mentioned, overall_sentiment should be "neutral" and sentiment_score should be 50.

2. Entity and Competitor Extraction:
   - Identify all meaningful brands, companies, and products mentioned in the text that are relevant alternatives or competitors in the domain.
   - If the target brand "{target_brand_name}" is mentioned, include it in `entities` with `is_target_brand = true`.
   - For all competitor and other brands, set `is_target_brand = false`.
   - `mention_position`: assign 1, 2, 3... corresponding to the exact chronological order in which the entities first appeared.
   - `context`: provide a concise excerpt or sentence showing what was said about that entity.
   - Avoid creating duplicate entities for the same brand in the list.

AI RESPONSE TEXT TO ANALYZE:
\"\"\"
{response_text}
\"\"\"
"""

    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": AIResponseAnalysisResult,
            },
        )
    except Exception as exc:
        raise AnalysisExecutionError(f"Gemini response analysis failed: {exc}") from exc

    raw_text = getattr(response, "text", None)
    if not raw_text:
        raise AnalysisExecutionError("Gemini returned an empty analysis response.")

    try:
        parsed_data = json.loads(raw_text)
        return AIResponseAnalysisResult.model_validate(parsed_data)
    except Exception as exc:
        raise AnalysisExecutionError(
            f"Failed to validate structured analysis output: {exc}. Response text: {raw_text[:200]}"
        ) from exc
