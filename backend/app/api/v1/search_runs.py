"""Search Runs API — execute a prompt via Gemini and persist the result."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.database import get_db
from app.models.ai_response import AIResponse
from app.models.citation import Citation
from app.models.entity import Entity
from app.models.prompt import Prompt
from app.models.search_run import SearchRun
from app.models.source import Source
from app.schemas.analysis import EntityRead, SearchRunAnalysisResponse
from app.schemas.citation import CitationRead, SearchRunSourcesResponse, SourceRead
from app.schemas.search_run import SearchRunCreate, SearchRunResponse, SearchRunListItem
from app.services.ai.citation_service import extract_and_persist_citations
from app.services.ai.gemini_service import (
    GeminiConfigurationError,
    GeminiExecutionError,
    generate,
)
from app.services.ai.response_analyzer import (
    AnalysisExecutionError,
    analyze_response,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Search Runs"])


@router.post(
    "/search-runs",
    response_model=SearchRunResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Execute a Prompt via Gemini",
    description=(
        "Takes an existing prompt by ID, sends its text to the Gemini AI API with "
        "Google Search grounding, stores the run in `search_runs`, persists the raw "
        "response in `ai_responses`, and extracts cited web sources into `sources` "
        "and `citations`."
    ),
)
def create_search_run(
    payload: SearchRunCreate,
    db: Session = Depends(get_db),
) -> SearchRunResponse:
    """Execute a prompt against the Gemini API and persist the result.

    Flow:
    1. Fetch the prompt — 404 if not found.
    2. Create a SearchRun record (status='running').
    3. Call Gemini with Google Search grounding.
    4. On success → create AIResponse (with grounding metadata), mark run 'completed'.
    5. Extract sources and citations from grounding metadata (best-effort).
    6. On any Gemini error → mark run 'failed', commit, then raise HTTP 502.
    """
    # ── 1. Resolve the prompt ──────────────────────────────────────────────
    prompt: Prompt | None = db.get(Prompt, payload.prompt_id)
    if prompt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prompt '{payload.prompt_id}' not found.",
        )

    now = datetime.now(tz=timezone.utc)

    # ── 2. Create the SearchRun row immediately ────────────────────────────
    search_run = SearchRun(
        prompt_id=prompt.id,
        project_id=prompt.project_id,
        engine="gemini",
        model=None,          # filled in after Gemini responds (model is from config)
        status="running",
        started_at=now,
    )
    db.add(search_run)
    db.flush()   # get search_run.id without a full commit so we can rollback cleanly

    try:
        # ── 3. Call Gemini with Google Search grounding ────────────────────
        result = generate(prompt.prompt_text)

        # ── 4a. Store the AI response ──────────────────────────────────────
        ai_response = AIResponse(
            search_run_id=search_run.id,
            response_text=result.text,
            response_metadata=result.metadata,   # includes 'grounding' key when available
        )
        db.add(ai_response)
        db.flush()  # get ai_response.id before citation extraction

        # ── 4b. Mark the run as completed ─────────────────────────────────
        completed_at = datetime.now(tz=timezone.utc)
        search_run.status = "completed"
        search_run.model = result.metadata.get("model")
        search_run.completed_at = completed_at

        # ── 5. Extract sources & citations (best-effort, non-fatal) ───────
        try:
            extract_and_persist_citations(
                db=db,
                ai_response=ai_response,
                grounding_data=result.grounding_data,
            )
        except Exception as cite_exc:
            # Citation extraction failure MUST NOT kill the search run result
            logger.warning(
                "Citation extraction failed for search_run %s (non-fatal): %s",
                search_run.id,
                cite_exc,
            )

        # ── 6. Automatically analyze brand presence & competitors (best-effort, non-fatal) ──
        try:
            target_brand_name = (
                search_run.project.brand.name
                if search_run.project and search_run.project.brand
                else None
            )
            if target_brand_name:
                analysis_result = analyze_response(
                    response_text=ai_response.response_text,
                    target_brand_name=target_brand_name,
                )
                for entity_data in analysis_result.entities:
                    entity_record = Entity(
                        ai_response_id=ai_response.id,
                        entity_name=entity_data.name[:255],
                        entity_type=entity_data.type[:100] if entity_data.type else "brand",
                        is_target_brand=entity_data.is_target_brand,
                        mention_position=entity_data.mention_position,
                        context_text=entity_data.context,
                    )
                    db.add(entity_record)

                updated_metadata = dict(ai_response.response_metadata or {})
                updated_metadata["analysis"] = {
                    "target_brand_name": target_brand_name,
                    "target_brand_mentioned": analysis_result.target_brand.mentioned,
                    "mention_count": analysis_result.target_brand.mention_count,
                    "positions": analysis_result.target_brand.positions,
                    "sentiment": {
                        "label": analysis_result.target_brand.overall_sentiment,
                        "score": analysis_result.target_brand.sentiment_score,
                    },
                    "entities_detected_count": len(analysis_result.entities),
                    "analyzed_at": datetime.now(tz=timezone.utc).isoformat(),
                }
                ai_response.response_metadata = updated_metadata
                flag_modified(ai_response, "response_metadata")
        except Exception as ana_exc:
            logger.warning(
                "Automatic response analysis failed for search_run %s (non-fatal): %s",
                search_run.id,
                ana_exc,
            )

        db.commit()
        db.refresh(search_run)

        return SearchRunResponse(
            search_run_id=search_run.id,
            status="completed",
            engine="gemini",
            model=search_run.model,
            response=result.text,
            started_at=search_run.started_at,
            completed_at=search_run.completed_at,
        )

    except GeminiConfigurationError as exc:
        # API key missing or SDK not installed — client configuration problem
        _fail_run(db, search_run, str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Gemini is not configured: {exc}",
        ) from exc

    except GeminiExecutionError as exc:
        # Gemini returned an error or empty response
        _fail_run(db, search_run, str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini execution error: {exc}",
        ) from exc

    except Exception as exc:
        # Unexpected error — don't leave the run stuck in 'running'
        _fail_run(db, search_run, f"Unexpected error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during search run execution.",
        ) from exc


# ── Helpers ────────────────────────────────────────────────────────────────

def _fail_run(db: Session, search_run: SearchRun, error_message: str) -> None:
    """Mark a SearchRun as failed and commit so the DB is never left inconsistent."""
    try:
        search_run.status = "failed"
        search_run.completed_at = datetime.now(tz=timezone.utc)
        search_run.error_message = error_message[:2000]   # guard against huge messages
        db.commit()
    except Exception:
        # If even the failure commit fails, at least roll back
        db.rollback()


# ── Citation & Source Extraction Endpoint ─────────────────────────────────

@router.post(
    "/search-runs/{search_run_id}/extract-sources",
    response_model=SearchRunSourcesResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract & Persist Sources/Citations",
    description=(
        "Idempotently re-extracts grounded web sources and citations from a completed "
        "search run's AI response and stores them in the `sources` and `citations` tables. "
        "Existing citations for this response are replaced on each call."
    ),
)
def extract_sources(
    search_run_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> SearchRunSourcesResponse:
    """Idempotently extract sources and citations from a stored AI response.

    Flow:
    1. Retrieve search_run — 404 if not found.
    2. Retrieve associated ai_response — 404 if not found.
    3. Run extract_and_persist_citations against stored grounding metadata.
    4. Return the sources and citations linked to this response.
    """
    # ── 1. Retrieve the search_run ─────────────────────────────────────────
    search_run: SearchRun | None = db.get(SearchRun, search_run_id)
    if search_run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SearchRun '{search_run_id}' not found.",
        )

    # ── 2. Retrieve its ai_response ────────────────────────────────────────
    ai_response: AIResponse | None = search_run.ai_response
    if ai_response is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI response not found for SearchRun '{search_run_id}'.",
        )

    # ── 3. Extract & persist citations ────────────────────────────────────
    try:
        extraction_result = extract_and_persist_citations(
            db=db,
            ai_response=ai_response,
            grounding_data=None,  # will load from ai_response.response_metadata['grounding']
        )
        db.commit()
        db.refresh(ai_response)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Source extraction failed: {exc}",
        ) from exc

    # ── 4. Query and return the full set of citations for this response ────
    saved_citations = (
        db.query(Citation)
        .filter(Citation.ai_response_id == ai_response.id)
        .order_by(Citation.citation_position.asc().nullslast(), Citation.created_at.asc())
        .all()
    )

    # Build unique sources list from saved citations
    seen_source_ids: set = set()
    unique_sources: list[Source] = []
    for cit in saved_citations:
        if cit.source_id not in seen_source_ids:
            seen_source_ids.add(cit.source_id)
            if cit.source:
                unique_sources.append(cit.source)

    return SearchRunSourcesResponse(
        search_run_id=search_run.id,
        ai_response_id=ai_response.id,
        sources_count=len(unique_sources),
        citations_count=len(saved_citations),
        sources=[SourceRead.model_validate(s) for s in unique_sources],
        citations=[CitationRead.model_validate(c) for c in saved_citations],
    )


@router.post(
    "/search-runs/{search_run_id}/analyze",
    response_model=SearchRunAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze AI Response Intelligence",
    description=(
        "Analyzes an existing AI search response for target brand visibility, "
        "competitor mentions, mention positions, context, and sentiment."
    ),
)
def analyze_search_run(
    search_run_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> SearchRunAnalysisResponse:
    """Analyze the stored AI response of a search run using Gemini.

    Flow:
    1. Retrieve search_run — 404 if not found.
    2. Retrieve associated ai_response — 404 if not found.
    3. Retrieve target brand via search_run -> project -> brand relationship.
    4. Call Gemini structured response analysis.
    5. Idempotently replace existing Entity records for this ai_response.
    6. Update ai_responses.response_metadata['analysis'] preserving prior metadata.
    7. Return full structured analysis response.
    """
    # ── 1. Retrieve the search_run ─────────────────────────────────────────
    search_run: SearchRun | None = db.get(SearchRun, search_run_id)
    if search_run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SearchRun '{search_run_id}' not found.",
        )

    # ── 2. Retrieve its ai_response ────────────────────────────────────────
    ai_response: AIResponse | None = search_run.ai_response
    if ai_response is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI response not found for SearchRun '{search_run_id}'.",
        )

    # ── 3. Resolve target brand from project relationship ───────────────────
    if not search_run.project or not search_run.project.brand:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project or Brand relation missing for this search run.",
        )
    target_brand_name = search_run.project.brand.name

    # ── 4. Call Gemini structured analysis ─────────────────────────────────
    try:
        analysis_result = analyze_response(
            response_text=ai_response.response_text,
            target_brand_name=target_brand_name,
        )
    except GeminiConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Gemini is not configured: {exc}",
        ) from exc
    except AnalysisExecutionError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini analysis error: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during AI response analysis.",
        ) from exc

    # ── 5 & 6. Idempotent storage of entities and sentiment ────────────────
    try:
        # Clear existing entities for this response to maintain idempotency
        db.query(Entity).filter(Entity.ai_response_id == ai_response.id).delete(synchronize_session=False)

        # Insert detected entities
        for entity_data in analysis_result.entities:
            entity_record = Entity(
                ai_response_id=ai_response.id,
                entity_name=entity_data.name[:255],
                entity_type=entity_data.type[:100] if entity_data.type else "brand",
                is_target_brand=entity_data.is_target_brand,
                mention_position=entity_data.mention_position,
                context_text=entity_data.context,
            )
            db.add(entity_record)

        # ── 7. Update response_metadata with sentiment (preserve existing keys)
        updated_metadata = dict(ai_response.response_metadata or {})
        updated_metadata["analysis"] = {
            "target_brand_name": target_brand_name,
            "target_brand_mentioned": analysis_result.target_brand.mentioned,
            "mention_count": analysis_result.target_brand.mention_count,
            "positions": analysis_result.target_brand.positions,
            "sentiment": {
                "label": analysis_result.target_brand.overall_sentiment,
                "score": analysis_result.target_brand.sentiment_score,
            },
            "entities_detected_count": len(analysis_result.entities),
            "analyzed_at": datetime.now(tz=timezone.utc).isoformat(),
        }
        ai_response.response_metadata = updated_metadata
        flag_modified(ai_response, "response_metadata")

        db.commit()
        db.refresh(ai_response)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while storing analysis results: {exc}",
        ) from exc

    # ── 8. Query saved entities to return ──────────────────────────────────
    saved_entities = (
        db.query(Entity)
        .filter(Entity.ai_response_id == ai_response.id)
        .order_by(Entity.mention_position.asc().nullslast(), Entity.created_at.asc())
        .all()
    )

    return SearchRunAnalysisResponse(
        search_run_id=search_run.id,
        ai_response_id=ai_response.id,
        target_brand=target_brand_name,
        target_brand_analysis=analysis_result.target_brand,
        entities_count=len(saved_entities),
        entities=[EntityRead.model_validate(e) for e in saved_entities],
        response_metadata=ai_response.response_metadata,
    )


@router.get(
    "/projects/{project_id}/search-runs",
    response_model=list[SearchRunListItem],
    status_code=status.HTTP_200_OK,
    summary="List Search Runs for Project",
    description="Retrieve historical search runs for a project ordered by start time descending.",
)
def list_project_search_runs(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> list[SearchRunListItem]:
    """Retrieve all search runs belonging to a project."""
    runs = (
        db.query(SearchRun)
        .filter(SearchRun.project_id == project_id)
        .order_by(SearchRun.started_at.desc())
        .all()
    )

    items: list[SearchRunListItem] = []
    for r in runs:
        ai_resp = r.ai_response
        has_analysis = bool(
            ai_resp
            and ai_resp.response_metadata
            and "analysis" in ai_resp.response_metadata
        )
        has_sources = bool(
            ai_resp
            and ai_resp.citations
            and len(ai_resp.citations) > 0
        )
        items.append(
            SearchRunListItem(
                search_run_id=r.id,
                prompt_id=r.prompt_id,
                project_id=r.project_id,
                prompt_text=r.prompt.prompt_text if r.prompt else None,
                prompt_category=r.prompt.category if r.prompt else None,
                status=r.status,
                engine=r.engine,
                model=r.model,
                response_text=ai_resp.response_text if ai_resp else None,
                has_analysis=has_analysis,
                has_sources=has_sources,
                started_at=r.started_at,
                completed_at=r.completed_at,
                error=r.error_message,
            )
        )
    return items


@router.get(
    "/search-runs/{search_run_id}",
    response_model=SearchRunListItem,
    status_code=status.HTTP_200_OK,
    summary="Get Search Run Details",
    description="Retrieve details and response text for a specific search run.",
)
def get_search_run(
    search_run_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> SearchRunListItem:
    """Retrieve a single search run with response details."""
    r = db.get(SearchRun, search_run_id)
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SearchRun '{search_run_id}' not found.",
        )
    ai_resp = r.ai_response
    has_analysis = bool(
        ai_resp
        and ai_resp.response_metadata
        and "analysis" in ai_resp.response_metadata
    )
    has_sources = bool(
        ai_resp
        and ai_resp.citations
        and len(ai_resp.citations) > 0
    )
    return SearchRunListItem(
        search_run_id=r.id,
        prompt_id=r.prompt_id,
        project_id=r.project_id,
        prompt_text=r.prompt.prompt_text if r.prompt else None,
        prompt_category=r.prompt.category if r.prompt else None,
        status=r.status,
        engine=r.engine,
        model=r.model,
        response_text=ai_resp.response_text if ai_resp else None,
        has_analysis=has_analysis,
        has_sources=has_sources,
        started_at=r.started_at,
        completed_at=r.completed_at,
        error=r.error_message,
    )

