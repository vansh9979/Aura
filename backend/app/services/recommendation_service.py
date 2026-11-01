"""Intelligent recommendations service for AI search visibility optimization."""
from __future__ import annotations

import json
import logging
import uuid
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import case
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.project import Project
from app.models.recommendation import Recommendation
from app.schemas.insight import ProjectInsightsResponse
from app.schemas.recommendation import (
    GeminiRecommendationsOutput,
    RecommendationItem,
)
from app.services.ai.gemini_service import _get_client
from app.services.insights_service import get_project_insights

logger = logging.getLogger(__name__)


def generate_project_recommendations(
    db: Session,
    project_id: uuid.UUID,
) -> List[Recommendation]:
    """Generate evidence-backed recommendations using Step 9 intelligence and Gemini.

    Args:
        db: Active SQLAlchemy database session.
        project_id: UUID of the project.

    Returns:
        List of persisted Recommendation records for this project.
    """
    # ── 1. Validate project existence ──────────────────────────────────────
    project: Optional[Project] = db.get(Project, project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id '{project_id}' not found.",
        )

    # ── 2. Collect authoritative Step 9 insights as ground truth ──────────
    insights: ProjectInsightsResponse = get_project_insights(db=db, project_id=project_id)

    # ── 3. Call Gemini ONCE with structured JSON output ────────────────────
    generated_items = _call_gemini_for_recommendations(insights)

    # If Gemini returns an empty list or fails, use deterministic fallback items
    if not generated_items:
        generated_items = _generate_deterministic_fallback_recommendations(insights)

    # ── 4. Idempotent Database Storage ─────────────────────────────────────
    # Limit to top 5 recommendations
    items_to_save = generated_items[:5]

    existing_open_recs = (
        db.query(Recommendation)
        .filter(
            Recommendation.project_id == project_id,
            Recommendation.status == "open",
        )
        .all()
    )
    existing_by_title = {r.title.strip().lower(): r for r in existing_open_recs}

    saved_recs: List[Recommendation] = []
    for item in items_to_save:
        title_key = item.title.strip().lower()
        if title_key in existing_by_title:
            # Update existing record in place
            rec = existing_by_title[title_key]
            rec.description = item.description
            rec.recommendation_type = item.recommendation_type
            rec.priority = item.priority
            rec.evidence = item.evidence
            saved_recs.append(rec)
        else:
            # Insert new recommendation
            new_rec = Recommendation(
                project_id=project_id,
                title=item.title[:255],
                description=item.description,
                recommendation_type=item.recommendation_type[:100] if item.recommendation_type else "content",
                priority=item.priority,
                evidence=item.evidence or {},
                status="open",
            )
            db.add(new_rec)
            saved_recs.append(new_rec)

    db.commit()

    for r in saved_recs:
        db.refresh(r)

    # Return stored recommendations ordered by priority and recency
    return get_project_recommendations(db=db, project_id=project_id)


def _call_gemini_for_recommendations(
    insights: ProjectInsightsResponse,
) -> List[RecommendationItem]:
    """Invoke Gemini once with structured JSON output to synthesize recommendations."""
    brand = insights.brand
    metrics = insights.metrics
    competitors_str = (
        ", ".join([f"{c.name} ({c.visibility_percentage}% vis, avg pos {c.average_position})" for c in insights.competitors[:3]])
        if insights.competitors
        else "None detected"
    )
    source_gaps_str = (
        ", ".join([f"{s.domain} ({s.citation_frequency} citations, assoc: {s.competitor_association})" for s in insights.source_gaps[:3] if s.domain])
        if insights.source_gaps
        else "None"
    )
    topic_gaps_str = (
        ", ".join([f"{tg.category} (competitor {tg.strongest_competitor} at {tg.competitor_visibility}% vs target at {tg.target_visibility}%)" for tg in insights.topic_gaps[:2]])
        if insights.topic_gaps
        else "None"
    )
    root_causes_str = (
        "\n".join([f"- [{rc.type}] ({rc.severity} severity): {rc.explanation}. Evidence: {', '.join(rc.evidence)}" for rc in insights.root_causes[:3]])
        if insights.root_causes
        else "No critical root causes."
    )

    prompt = f"""You are an AI Search Optimization Strategist.
Analyze the following empirical visibility data for target brand "{brand}" on {insights.metric_date}:

METRICS:
- Visibility Score: {metrics.visibility_score}%
- Average Position: {metrics.average_position}
- Sentiment Score: {metrics.sentiment_score}/100
- Share of Voice: {metrics.share_of_voice}%
- Mention Count: {metrics.mention_count}

COMPETITOR LANDSCAPE:
- Top Competitors: {competitors_str}

SOURCE & TOPIC GAPS:
- Source Gaps (domains citing competitors): {source_gaps_str}
- Topic Gaps (categories dominated by competitors): {topic_gaps_str}

IDENTIFIED ROOT CAUSES:
{root_causes_str}

TASK:
Provide between 3 and 5 specific, highly actionable, prioritized recommendations to improve "{brand}"'s AI search visibility.
CRITICAL CONSTRAINTS:
1. Do NOT invent outside competitors, URLs, domains, or statistics.
2. Every recommendation must connect directly to the supplied empirical evidence (e.g. referencing the specific competitors, gap domains, query categories, or scores).
3. recommendation_type must be strictly one of: 'content', 'source', 'reputation', 'topic', 'competitor'.
4. priority must be strictly one of: 'high', 'medium', 'low'.
5. Avoid generic advice such as "Improve your SEO".
6. Return valid structured JSON.
"""

    try:
        client = _get_client()
        model = settings.GEMINI_MODEL
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": GeminiRecommendationsOutput,
            },
        )
        raw_text = getattr(response, "text", None)
        if raw_text:
            parsed = json.loads(raw_text)
            validated = GeminiRecommendationsOutput.model_validate(parsed)
            if validated.recommendations:
                return validated.recommendations
    except Exception as exc:
        logger.warning("Gemini recommendation generation call failed; falling back to deterministic: %s", exc)

    return []


def _generate_deterministic_fallback_recommendations(
    insights: ProjectInsightsResponse,
) -> List[RecommendationItem]:
    """Deterministic fallback recommendations generated strictly from Step 9 root causes and gaps."""
    items: List[RecommendationItem] = []
    brand = insights.brand

    # 1. Source Gap Recommendation
    if insights.source_gaps:
        top_domains = [sg.domain for sg in insights.source_gaps[:3] if sg.domain]
        domain_list_str = ", ".join(top_domains) if top_domains else "authority review sites"
        items.append(
            RecommendationItem(
                title=f"Earn Citations on Competitor Authority Domains ({domain_list_str})",
                description=(
                    f"Competitors are frequently cited in AI search responses from domains such as {domain_list_str}. "
                    f"Establish brand presence, product reviews, and benchmark profiles on these exact citation sources to close the source gap."
                ),
                recommendation_type="source",
                priority="high",
                evidence={
                    "metric": "source_gaps",
                    "value": len(insights.source_gaps),
                    "reason": f"Competitors appear on {len(insights.source_gaps)} domains where {brand} lacks coverage.",
                },
            )
        )

    # 2. Topic Gap Recommendation
    if insights.topic_gaps:
        top_gap = insights.topic_gaps[0]
        items.append(
            RecommendationItem(
                title=f"Develop Targeted Content for the '{top_gap.category}' Category",
                description=(
                    f"Competitor '{top_gap.strongest_competitor}' dominates the '{top_gap.category}' topic with {top_gap.competitor_visibility}% visibility "
                    f"versus {insights.brand} at {top_gap.target_visibility}%. Publish dedicated guides and comparison content addressing this topic cluster."
                ),
                recommendation_type="topic",
                priority="high",
                evidence={
                    "metric": "topic_visibility",
                    "value": top_gap.target_visibility,
                    "reason": f"Competitor {top_gap.strongest_competitor} holds {top_gap.competitor_visibility}% visibility in {top_gap.category}.",
                },
            )
        )

    # 3. Low Visibility / Share of Voice Recommendation
    vis = insights.metrics.visibility_score or 0.0
    sov = insights.metrics.share_of_voice or 0.0
    if vis < 50.0 or sov < 30.0:
        top_comp = insights.competitors[0].name if insights.competitors else "market leaders"
        items.append(
            RecommendationItem(
                title=f"Optimize Digital Brand Footprint Against {top_comp}",
                description=(
                    f"{brand} currently has a {vis}% visibility score and {sov}% share of voice. "
                    f"Expand authoritative product documentation and public comparison pages to increase entity detection in AI search models."
                ),
                recommendation_type="content",
                priority="high" if vis < 30.0 else "medium",
                evidence={
                    "metric": "visibility_score",
                    "value": vis,
                    "reason": f"Brand visibility is at {vis}% with {sov}% share of voice.",
                },
            )
        )

    # 4. Sentiment Recommendation
    sent = insights.metrics.sentiment_score
    if sent is not None and sent < 70.0:
        items.append(
            RecommendationItem(
                title="Improve Sentiment and Address Product Feature Critiques",
                description=(
                    f"Current sentiment score towards {brand} is {sent}/100. "
                    f"Engage community forums and published reviews to address common product limitations highlighted by AI search engines."
                ),
                recommendation_type="reputation",
                priority="medium",
                evidence={
                    "metric": "sentiment_score",
                    "value": sent,
                    "reason": f"Sentiment score of {sent}/100 indicates neutral or critical AI response framing.",
                },
            )
        )

    # 5. Competitor Positioning Recommendation
    avg_pos = insights.metrics.average_position
    if avg_pos is not None and avg_pos > 1.5 and insights.competitors:
        comp_name = insights.competitors[0].name
        items.append(
            RecommendationItem(
                title=f"Publish Competitive Comparison Versus {comp_name}",
                description=(
                    f"{brand} appears at average position {avg_pos}, behind competitors. "
                    f"Publish head-to-head comparison pages highlighting key differentiators to improve chronological mention position."
                ),
                recommendation_type="competitor",
                priority="medium",
                evidence={
                    "metric": "average_position",
                    "value": avg_pos,
                    "reason": f"Average mention position is {avg_pos}, lagging behind {comp_name}.",
                },
            )
        )

    return items


def get_project_recommendations(
    db: Session,
    project_id: uuid.UUID,
) -> List[Recommendation]:
    """Retrieve stored recommendations for a project ordered by priority and recency.

    Args:
        db: Active SQLAlchemy database session.
        project_id: UUID of the project.

    Returns:
        List of Recommendation records ordered by priority (high -> medium -> low) and newest first.
    """
    project: Optional[Project] = db.get(Project, project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id '{project_id}' not found.",
        )

    priority_rank = case(
        (Recommendation.priority == "high", 1),
        (Recommendation.priority == "medium", 2),
        else_=3,
    )

    return (
        db.query(Recommendation)
        .filter(Recommendation.project_id == project_id)
        .order_by(priority_rank.asc(), Recommendation.created_at.desc())
        .all()
    )
