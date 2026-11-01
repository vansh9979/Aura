"""Metrics calculation and retrieval service for AI search visibility intelligence."""
from __future__ import annotations

import logging
import uuid
from collections import defaultdict
from datetime import date
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.ai_response import AIResponse
from app.models.entity import Entity
from app.models.metric import Metric
from app.models.project import Project
from app.models.search_run import SearchRun

logger = logging.getLogger(__name__)

RELEVANT_ENTITY_TYPES = {"brand", "company", "product"}


def calculate_project_metrics(
    db: Session,
    project_id: uuid.UUID,
    target_date: Optional[date] = None,
) -> Metric:
    """Calculate and upsert project-level AI search visibility metrics.

    Calculates 5 KPIs from stored PostgreSQL data without external AI calls:
    1. visibility_score: (responses where target brand was mentioned / total analyzed) * 100
    2. average_position: avg first mention position across responses where mentioned (null if never mentioned)
    3. sentiment_score: avg target-brand sentiment score across responses where mentioned (null if never mentioned)
    4. share_of_voice: target brand entity mentions / total relevant brand/company entity mentions * 100
    5. mention_count: total target-brand mentions across analyzed responses

    Upserts into the `metrics` table respecting UNIQUE(project_id, metric_date).

    Args:
        db: Active SQLAlchemy database session.
        project_id: UUID of the project to calculate metrics for.
        target_date: Optional specific date to calculate for. If None, processes all dates with analyzed data.

    Returns:
        The upserted Metric record for target_date or the most recent analyzed date.
    """
    # ── 1. Validate project existence ──────────────────────────────────────
    project: Optional[Project] = db.get(Project, project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id '{project_id}' not found.",
        )

    if not project.brand or not project.brand.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project '{project_id}' does not have an associated brand.",
        )

    target_brand_name = project.brand.name.strip()
    target_brand_name_lower = target_brand_name.lower()

    # ── 2. Retrieve completed search runs with valid analysis ─────────────
    search_runs: List[SearchRun] = (
        db.query(SearchRun)
        .filter(
            SearchRun.project_id == project_id,
            SearchRun.status == "completed",
        )
        .all()
    )

    # Filter to runs that have an AIResponse with analysis metadata
    grouped_by_date: Dict[date, List[tuple[SearchRun, AIResponse, dict]]] = defaultdict(list)

    for sr in search_runs:
        ai_resp: Optional[AIResponse] = sr.ai_response
        if not ai_resp:
            continue

        meta = ai_resp.response_metadata or {}
        analysis = meta.get("analysis")
        if not analysis or not isinstance(analysis, dict):
            # Not analyzed yet — exclude per requirements
            continue

        # Determine metric date from search run completed_at or created_at
        run_dt = sr.completed_at or sr.created_at
        run_date = run_dt.date() if run_dt else date.today()

        if target_date is not None and run_date != target_date:
            continue

        grouped_by_date[run_date].append((sr, ai_resp, analysis))

    # ── 3. Handle zero analyzed responses ──────────────────────────────────
    if not grouped_by_date:
        # If no analyzed responses exist, store/return a default record (0s and nulls)
        metric_d = target_date or date.today()
        metric_record = _upsert_metric(
            db=db,
            project_id=project_id,
            metric_date=metric_d,
            visibility_score=0.0,
            average_position=None,
            sentiment_score=None,
            share_of_voice=0.0,
            mention_count=0,
        )
        db.commit()
        db.refresh(metric_record)
        return metric_record

    # ── 4. Calculate metrics for each date ─────────────────────────────────
    upserted_records: List[Metric] = []

    for metric_d in sorted(grouped_by_date.keys()):
        analyzed_items = grouped_by_date[metric_d]
        total_analyzed = len(analyzed_items)

        # Responses where target brand was mentioned
        mentioned_items: List[tuple[SearchRun, AIResponse, dict]] = []
        primary_positions: List[int] = []
        sentiment_scores: List[float] = []
        total_brand_mentions = 0

        # Collect entities across all analyzed responses for this date
        ai_response_ids = [ai_resp.id for _, ai_resp, _ in analyzed_items]
        entities_for_date: List[Entity] = (
            db.query(Entity)
            .filter(Entity.ai_response_id.in_(ai_response_ids))
            .all()
        )

        # Map entities by ai_response_id
        entities_by_response: Dict[uuid.UUID, List[Entity]] = defaultdict(list)
        for ent in entities_for_date:
            entities_by_response[ent.ai_response_id].append(ent)

        for sr, ai_resp, analysis in analyzed_items:
            resp_entities = entities_by_response[ai_resp.id]

            # Check target brand mention from analysis metadata and entities
            meta_mentioned = bool(analysis.get("target_brand_mentioned", False))
            entity_has_target = any(
                e.is_target_brand or e.entity_name.strip().lower() == target_brand_name_lower
                for e in resp_entities
            )
            is_mentioned = meta_mentioned or entity_has_target

            if is_mentioned:
                mentioned_items.append((sr, ai_resp, analysis))

                # Extract first/primary mention position
                positions = analysis.get("positions") or []
                primary_pos: Optional[int] = None
                if positions and isinstance(positions, list) and len(positions) > 0:
                    primary_pos = positions[0]
                else:
                    # Fallback to minimum mention_position in entities
                    target_entity_positions = [
                        e.mention_position
                        for e in resp_entities
                        if (e.is_target_brand or e.entity_name.strip().lower() == target_brand_name_lower)
                        and e.mention_position is not None
                        and e.mention_position >= 1
                    ]
                    if target_entity_positions:
                        primary_pos = min(target_entity_positions)

                if primary_pos is not None and primary_pos >= 1:
                    primary_positions.append(primary_pos)

                # Extract target-brand sentiment score
                sentiment_info = analysis.get("sentiment") or {}
                sent_score = sentiment_info.get("score")
                if sent_score is not None and isinstance(sent_score, (int, float)):
                    # Clamp to 0-100
                    clamped_score = max(0.0, min(100.0, float(sent_score)))
                    sentiment_scores.append(clamped_score)

            # Mention count calculation: use max of metadata count and entity count
            meta_count = analysis.get("mention_count", 0)
            target_entity_count = sum(
                1
                for e in resp_entities
                if e.is_target_brand or e.entity_name.strip().lower() == target_brand_name_lower
            )
            resp_mentions = max(int(meta_count) if isinstance(meta_count, (int, float)) else 0, target_entity_count)
            total_brand_mentions += resp_mentions

        # ── Compute KPI 1: Visibility Score (0-100) ────────────────────────
        if total_analyzed > 0:
            visibility_score = round((len(mentioned_items) / total_analyzed) * 100.0, 2)
            visibility_score = max(0.0, min(100.0, visibility_score))
        else:
            visibility_score = 0.0

        # ── Compute KPI 2: Average Position (>= 1.0 or None) ───────────────
        if primary_positions:
            average_position = round(sum(primary_positions) / len(primary_positions), 2)
        else:
            average_position = None

        # ── Compute KPI 3: Sentiment Score (0-100 or None) ─────────────────
        if sentiment_scores:
            avg_sentiment = sum(sentiment_scores) / len(sentiment_scores)
            sentiment_score = round(max(0.0, min(100.0, avg_sentiment)), 2)
        else:
            sentiment_score = None

        # ── Compute KPI 4: Share of Voice (0-100) ──────────────────────────
        # Only count meaningful brand/company/product entities extracted by Step 6
        relevant_entities = [
            e
            for e in entities_for_date
            if e.entity_type and e.entity_type.strip().lower() in RELEVANT_ENTITY_TYPES
        ]
        target_entities = [
            e
            for e in relevant_entities
            if e.is_target_brand or e.entity_name.strip().lower() == target_brand_name_lower
        ]

        if relevant_entities:
            share_of_voice = round((len(target_entities) / len(relevant_entities)) * 100.0, 2)
            share_of_voice = max(0.0, min(100.0, share_of_voice))
        else:
            share_of_voice = 0.0

        # ── Compute KPI 5: Mention Count (>= 0) ────────────────────────────
        mention_count = total_brand_mentions

        # ── Upsert record into `metrics` ───────────────────────────────────
        rec = _upsert_metric(
            db=db,
            project_id=project_id,
            metric_date=metric_d,
            visibility_score=visibility_score,
            average_position=average_position,
            sentiment_score=sentiment_score,
            share_of_voice=share_of_voice,
            mention_count=mention_count,
        )
        upserted_records.append(rec)

    db.commit()

    # Refresh records after commit
    for r in upserted_records:
        db.refresh(r)

    # Return target_date record or most recent record
    if target_date:
        for r in upserted_records:
            if r.metric_date == target_date:
                return r

    return upserted_records[-1]


def _upsert_metric(
    db: Session,
    project_id: uuid.UUID,
    metric_date: date,
    visibility_score: Optional[float],
    average_position: Optional[float],
    sentiment_score: Optional[float],
    share_of_voice: Optional[float],
    mention_count: int,
) -> Metric:
    """Helper to insert or update a Metric record respecting unique (project_id, metric_date)."""
    existing: Optional[Metric] = (
        db.query(Metric)
        .filter(
            Metric.project_id == project_id,
            Metric.metric_date == metric_date,
        )
        .first()
    )

    if existing:
        existing.visibility_score = visibility_score
        existing.average_position = average_position
        existing.sentiment_score = sentiment_score
        existing.share_of_voice = share_of_voice
        existing.mention_count = mention_count
        return existing
    else:
        new_metric = Metric(
            project_id=project_id,
            metric_date=metric_date,
            visibility_score=visibility_score,
            average_position=average_position,
            sentiment_score=sentiment_score,
            share_of_voice=share_of_voice,
            mention_count=mention_count,
        )
        db.add(new_metric)
        return new_metric


def get_historical_metrics(
    db: Session,
    project_id: uuid.UUID,
) -> List[Metric]:
    """Retrieve historical daily metrics for a project ordered by metric_date descending.

    Args:
        db: Active SQLAlchemy database session.
        project_id: UUID of the project.

    Returns:
        List of Metric records ordered by metric_date DESC.
    """
    project: Optional[Project] = db.get(Project, project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id '{project_id}' not found.",
        )

    return (
        db.query(Metric)
        .filter(Metric.project_id == project_id)
        .order_by(Metric.metric_date.desc(), Metric.created_at.desc())
        .all()
    )
