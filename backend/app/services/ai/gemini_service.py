"""Gemini AI provider service — isolated wrapper around the google-genai SDK."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from app.core.config import settings


@dataclass
class GeminiResult:
    """Structured result returned from a Gemini API call."""

    text: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    grounding_data: Optional[Dict[str, Any]] = None


class GeminiConfigurationError(Exception):
    """Raised when GEMINI_API_KEY is missing or Gemini cannot be initialised."""


class GeminiExecutionError(Exception):
    """Raised when Gemini returns an error or an empty response."""


def _get_client():
    """Build and return a configured google-genai Client.

    Raises GeminiConfigurationError if GEMINI_API_KEY is absent.
    Import is deferred so a missing SDK does not break the application at
    startup; the error surfaces only when the endpoint is actually called.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise GeminiConfigurationError(
            "GEMINI_API_KEY is not configured. "
            "Set it in backend/.env before calling search-runs."
        )

    try:
        from google import genai  # type: ignore[import-untyped]
    except ImportError as exc:
        raise GeminiConfigurationError(
            "google-genai SDK is not installed. Run: pip install google-genai"
        ) from exc

    return genai.Client(api_key=api_key)


def generate(
    prompt_text: str,
    enable_grounding: bool | None = None,
    model: str | None = None,
) -> GeminiResult:
    """Send *prompt_text* to the configured Gemini model and return the result.

    Args:
        prompt_text: The raw prompt string to send.
        enable_grounding: Explicitly enable or disable Google Search grounding.
            If None, uses settings.GEMINI_SEARCH_GROUNDING_ENABLED.
        model: Model identifier override. If None, uses settings.GEMINI_MODEL.

    Returns:
        GeminiResult containing the response text, captured metadata, and grounding info.

    Raises:
        GeminiConfigurationError: API key is missing or SDK unavailable.
        GeminiExecutionError: Gemini returned an error or an empty response.
    """
    client = _get_client()
    chosen_model = model or settings.GEMINI_MODEL
    should_ground = (
        enable_grounding
        if enable_grounding is not None
        else settings.GEMINI_SEARCH_GROUNDING_ENABLED
    )

    call_config = None
    if should_ground:
        try:
            from google.genai import types
            call_config = types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())]
            )
        except Exception as exc:
            raise GeminiExecutionError(
                f"Failed to configure Google Search grounding: {exc}"
            ) from exc

    try:
        if call_config is not None:
            response = client.models.generate_content(
                model=chosen_model,
                contents=prompt_text,
                config=call_config,
            )
        else:
            response = client.models.generate_content(
                model=chosen_model,
                contents=prompt_text,
            )
    except Exception as exc:
        raise GeminiExecutionError(
            f"Gemini API call failed: {exc}"
        ) from exc

    # Extract text — treat None / empty string as a failure
    response_text: str | None = None
    try:
        response_text = response.text
    except Exception:
        pass

    if not response_text:
        raise GeminiExecutionError(
            "Gemini returned an empty response. "
            "The request may have been blocked by safety filters."
        )

    # Collect useful metadata without exposing the API key
    metadata: Dict[str, Any] = {
        "provider": "google",
        "model": chosen_model,
    }

    # Finish reason (may be absent in some response shapes)
    try:
        candidates = response.candidates
        if candidates:
            finish_reason = candidates[0].finish_reason
            # finish_reason is an enum; store its name for JSON-serializability
            metadata["finish_reason"] = (
                finish_reason.name if hasattr(finish_reason, "name") else str(finish_reason)
            )
    except Exception:
        pass

    # Usage metadata (token counts)
    try:
        usage = response.usage_metadata
        if usage is not None:
            metadata["usage"] = {
                "prompt_token_count": getattr(usage, "prompt_token_count", None),
                "candidates_token_count": getattr(usage, "candidates_token_count", None),
                "total_token_count": getattr(usage, "total_token_count", None),
            }
    except Exception:
        pass

    # Safety ratings from the first candidate
    try:
        candidates = response.candidates
        if candidates:
            ratings = candidates[0].safety_ratings
            if ratings:
                metadata["safety_ratings"] = [
                    {
                        "category": (
                            r.category.name if hasattr(r.category, "name") else str(r.category)
                        ),
                        "probability": (
                            r.probability.name
                            if hasattr(r.probability, "name")
                            else str(r.probability)
                        ),
                    }
                    for r in ratings
                ]
    except Exception:
        pass

    # Grounding metadata (web sources, search queries, supports)
    grounding_data: Dict[str, Any] | None = None
    try:
        candidates = response.candidates
        if candidates and hasattr(candidates[0], "grounding_metadata"):
            gm = candidates[0].grounding_metadata
            if gm:
                grounding_data = {
                    "web_search_queries": getattr(gm, "web_search_queries", None) or [],
                    "search_entry_point": (
                        getattr(getattr(gm, "search_entry_point", None), "rendered_content", None)
                    ),
                    "grounding_chunks": [],
                    "grounding_supports": [],
                }
                raw_chunks = getattr(gm, "grounding_chunks", None) or []
                for idx, c in enumerate(raw_chunks):
                    web = getattr(c, "web", None)
                    if web:
                        grounding_data["grounding_chunks"].append({
                            "index": idx,
                            "uri": getattr(web, "uri", None),
                            "title": getattr(web, "title", None),
                            "domain": getattr(web, "domain", None),
                        })
                raw_supports = getattr(gm, "grounding_supports", None) or []
                for s in raw_supports:
                    seg = getattr(s, "segment", None)
                    support_item = {
                        "grounding_chunk_indices": getattr(s, "grounding_chunk_indices", None) or [],
                        "confidence_scores": getattr(s, "confidence_scores", None) or [],
                        "segment": {
                            "start_index": getattr(seg, "start_index", None),
                            "end_index": getattr(seg, "end_index", None),
                            "text": getattr(seg, "text", None),
                        } if seg else None,
                    }
                    grounding_data["grounding_supports"].append(support_item)
    except Exception:
        pass

    if grounding_data:
        metadata["grounding"] = grounding_data

    return GeminiResult(text=response_text, metadata=metadata, grounding_data=grounding_data)
