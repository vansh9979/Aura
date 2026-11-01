"""Citation and Source intelligence service.

Extracts grounded web sources and citation linkages from Gemini grounding metadata,
deduplicating sources in the PostgreSQL `sources` table and recording citations
in the `citations` table.
"""
from __future__ import annotations

import logging
import re
import urllib.parse
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.ai_response import AIResponse
from app.models.citation import Citation
from app.models.source import Source

logger = logging.getLogger(__name__)

DOMAIN_REGEX = re.compile(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
PAREN_DOMAIN_REGEX = re.compile(r"\(([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)")


@dataclass
class ExtractedSourceInfo:
    """Normalized source information extracted from a grounding chunk."""

    chunk_index: int
    url: str
    domain: str
    title: Optional[str] = None


@dataclass
class CitationExtractionResult:
    """Result of source and citation extraction."""

    sources_count: int = 0
    citations_count: int = 0
    new_sources_created: int = 0
    existing_sources_reused: int = 0
    sources: List[Source] = field(default_factory=list)
    citations: List[Citation] = field(default_factory=list)


def _extract_domain(url: str, title: Optional[str] = None, explicit_domain: Optional[str] = None) -> str:
    """Determine the cleanest domain representation from URL and title."""
    if explicit_domain and explicit_domain.strip():
        return explicit_domain.strip().lower()

    if title:
        trimmed_title = title.strip()
        if DOMAIN_REGEX.match(trimmed_title):
            return trimmed_title.lower()
        paren_match = PAREN_DOMAIN_REGEX.search(trimmed_title)
        if paren_match:
            return paren_match.group(1).lower()

    try:
        parsed = urllib.parse.urlparse(url)
        netloc = parsed.netloc.lower()
        if ":" in netloc:
            netloc = netloc.split(":")[0]
        if netloc.startswith("www."):
            netloc = netloc[4:]
        if netloc:
            return netloc
    except Exception:
        pass

    return "unknown"


def extract_and_persist_citations(
    db: Session,
    ai_response: AIResponse,
    grounding_data: Optional[Dict[str, Any]] = None,
) -> CitationExtractionResult:
    """Extract web sources and citations from Gemini grounding metadata and persist them.

    Args:
        db: Active SQLAlchemy session.
        ai_response: The stored AIResponse model instance.
        grounding_data: Optional grounding metadata dict. If None, loaded from
            ai_response.response_metadata.get('grounding').

    Returns:
        CitationExtractionResult with details on created/reused sources and citations.
    """
    result = CitationExtractionResult()

    if not grounding_data:
        metadata = ai_response.response_metadata or {}
        grounding_data = metadata.get("grounding")

    if not grounding_data or not isinstance(grounding_data, dict):
        logger.info("No grounding metadata found for AI response %s", ai_response.id)
        return result

    raw_chunks: List[Dict[str, Any]] = grounding_data.get("grounding_chunks") or []
    raw_supports: List[Dict[str, Any]] = grounding_data.get("grounding_supports") or []

    if not raw_chunks:
        logger.info("Grounding metadata for AI response %s has no chunks", ai_response.id)
        return result

    # ── 1. Extract & Deduplicate Sources in `sources` table ─────────────────
    chunk_index_to_source: Dict[int, Source] = {}
    seen_urls_in_run: Dict[str, Source] = {}

    for c in raw_chunks:
        idx = c.get("index", 0)
        url = c.get("uri")
        if not url or not isinstance(url, str) or not url.strip():
            continue

        url = url.strip()
        title = (c.get("title") or "").strip() or None
        explicit_domain = c.get("domain")
        domain = _extract_domain(url, title=title, explicit_domain=explicit_domain)

        # Check if already resolved within this run
        if url in seen_urls_in_run:
            source = seen_urls_in_run[url]
            chunk_index_to_source[idx] = source
            continue

        # Check if URL already exists in DB (Source Deduplication)
        existing_source = db.query(Source).filter(Source.url == url).first()
        if existing_source is not None:
            source = existing_source
            result.existing_sources_reused += 1
            # Update title if previous title was missing but now available
            if not source.title and title:
                source.title = title[:512]
        else:
            source = Source(
                url=url[:2048],
                domain=domain[:255],
                title=title[:512] if title else None,
            )
            db.add(source)
            db.flush()  # assign source.id
            result.new_sources_created += 1

        seen_urls_in_run[url] = source
        chunk_index_to_source[idx] = source
        if source not in result.sources:
            result.sources.append(source)

    result.sources_count = len(result.sources)

    # ── 2. Idempotency: Remove existing citations for this AI response ───────
    db.query(Citation).filter(Citation.ai_response_id == ai_response.id).delete(synchronize_session=False)

    # ── 3. Extract & Link Citations ─────────────────────────────────────────
    created_citations: List[Citation] = []
    sources_cited_in_segments: set[int] = set()
    citation_position_counter = 1

    # Specific segment citations (citation_type="citation")
    for support in raw_supports:
        indices: List[int] = support.get("grounding_chunk_indices") or []
        segment = support.get("segment") or {}
        segment_text = segment.get("text") if isinstance(segment, dict) else None

        for chunk_idx in indices:
            source = chunk_index_to_source.get(chunk_idx)
            if not source:
                continue

            sources_cited_in_segments.add(chunk_idx)
            citation = Citation(
                ai_response_id=ai_response.id,
                source_id=source.id,
                citation_type="citation",
                citation_position=citation_position_counter,
                cited_text=segment_text,
            )
            db.add(citation)
            created_citations.append(citation)
            citation_position_counter += 1

    # Grounding context sources not explicitly attached to a single segment (citation_type="grounding")
    for chunk_idx, source in chunk_index_to_source.items():
        if chunk_idx not in sources_cited_in_segments:
            # Avoid duplicate citations for the exact same source in this response
            already_linked = any(cit.source_id == source.id for cit in created_citations)
            if not already_linked:
                citation = Citation(
                    ai_response_id=ai_response.id,
                    source_id=source.id,
                    citation_type="grounding",
                    citation_position=citation_position_counter,
                    cited_text=None,
                )
                db.add(citation)
                created_citations.append(citation)
                citation_position_counter += 1

    db.flush()
    result.citations = created_citations
    result.citations_count = len(created_citations)

    return result
