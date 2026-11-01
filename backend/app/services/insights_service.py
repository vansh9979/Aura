"""Insights intelligence service for root-cause, competitor, and source-gap analysis."""
from __future__ import annotations

import json
import logging
import uuid
from collections import defaultdict
from datetime import date
from typing import Dict, List, Optional, Set, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ai_response import AIResponse
from app.models.citation import Citation
from app.models.entity import Entity
from app.models.metric import Metric
from app.models.project import Project
from app.models.search_run import SearchRun
from app.models.source import Source
from app.schemas.insight import (
    CompetitorInsight,
    DiagnosisOutput,
    ProjectInsightsResponse,
    ProjectMetricsSummary,
    RootCauseItem,
    SourceGapInsight,
    TopicGapInsight,
)
from app.services.ai.gemini_service import _get_client
from app.services.metrics_service import calculate_project_metrics

logger = logging.getLogger(__name__)

RELEVANT_ENTITY_TYPES = {"brand", "company", "product"}


def get_project_insights(
    db: Session,
    project_id: uuid.UUID,
    metric_date: Optional[date] = None,
) -> ProjectInsightsResponse:
    """Generate evidence-based root-cause, competitor, and source-gap intelligence.

    Args:
        db: Active SQLAlchemy database session.
        project_id: UUID of the project to analyze.
        metric_date: Optional specific metric date (default: latest available date).

    Returns:
        Structured ProjectInsightsResponse containing authoritative metrics,
        competitors, source gaps, topic gaps, root causes, and Gemini diagnosis.
    """
    # ── 1. Validate Project & Target Brand ─────────────────────────────────
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

    # ── 2. Determine Evaluated Date & Retrieve/Calculate Metrics ──────────
    if metric_date is not None:
        target_d = metric_date
    else:
        # Find latest metric date or latest completed search run date
        latest_metric = (
            db.query(Metric)
            .filter(Metric.project_id == project_id)
            .order_by(Metric.metric_date.desc())
            .first()
        )
        if latest_metric is not None:
            target_d = latest_metric.metric_date
        else:
            latest_run = (
                db.query(SearchRun)
                .filter(SearchRun.project_id == project_id, SearchRun.status == "completed")
                .order_by(SearchRun.created_at.desc())
                .first()
            )
            target_d = (latest_run.completed_at or latest_run.created_at).date() if latest_run else date.today()

    # Retrieve or calculate authoritative metrics record
    metric_record = (
        db.query(Metric)
        .filter(Metric.project_id == project_id, Metric.metric_date == target_d)
        .first()
    )
    if metric_record is None:
        metric_record = calculate_project_metrics(db=db, project_id=project_id, target_date=target_d)

    metrics_summary = ProjectMetricsSummary(
        visibility_score=metric_record.visibility_score,
        average_position=metric_record.average_position,
        sentiment_score=metric_record.sentiment_score,
        share_of_voice=metric_record.share_of_voice,
        mention_count=metric_record.mention_count,
    )

    # ── 3. Retrieve Analyzed Search Runs for this Project & Date ───────────
    all_completed_runs: List[SearchRun] = (
        db.query(SearchRun)
        .filter(SearchRun.project_id == project_id, SearchRun.status == "completed")
        .all()
    )

    analyzed_runs: List[Tuple[SearchRun, AIResponse, dict]] = []
    for sr in all_completed_runs:
        ai_resp: Optional[AIResponse] = sr.ai_response
        if not ai_resp:
            continue
        meta = ai_resp.response_metadata or {}
        analysis = meta.get("analysis")
        if not analysis or not isinstance(analysis, dict):
            continue

        run_dt = sr.completed_at or sr.created_at
        run_date = run_dt.date() if run_dt else date.today()
        if run_date == target_d:
            analyzed_runs.append((sr, ai_resp, analysis))

    # If no runs on the exact target date, fallback to all analyzed runs for the project
    if not analyzed_runs:
        for sr in all_completed_runs:
            ai_resp = sr.ai_response
            if not ai_resp:
                continue
            meta = ai_resp.response_metadata or {}
            analysis = meta.get("analysis")
            if analysis and isinstance(analysis, dict):
                analyzed_runs.append((sr, ai_resp, analysis))

    total_analyzed = len(analyzed_runs)

    # ── Handle Insufficient Data Gracefully ────────────────────────────────
    if total_analyzed == 0:
        return ProjectInsightsResponse(
            project_id=project_id,
            brand=target_brand_name,
            project_name=project.name,
            metric_date=target_d,
            metrics=metrics_summary,
            competitors=[],
            source_gaps=[],
            topic_gaps=[],
            root_causes=[
                RootCauseItem(
                    type="LOW_VISIBILITY",
                    severity="high",
                    evidence=["Zero successfully analyzed search responses found for this project."],
                    explanation="No completed search runs have been analyzed yet. Execute AI search runs to generate insights.",
                )
            ],
            diagnosis=(
                f"No analyzed search response data is currently available for '{target_brand_name}' "
                f"on {target_d}. Please execute search runs to generate insights."
            ),
        )

    # ── Collect Entities & Citations for Analyzed Runs ─────────────────────
    ai_response_ids = [ai_resp.id for _, ai_resp, _ in analyzed_runs]

    all_entities: List[Entity] = (
        db.query(Entity)
        .filter(Entity.ai_response_id.in_(ai_response_ids))
        .all()
    )
    entities_by_response: Dict[uuid.UUID, List[Entity]] = defaultdict(list)
    for e in all_entities:
        entities_by_response[e.ai_response_id].append(e)

    # Track target brand mention per response
    target_mentioned_response_ids: Set[uuid.UUID] = set()
    for _, ai_resp, analysis in analyzed_runs:
        resp_entities = entities_by_response[ai_resp.id]
        meta_mentioned = bool(analysis.get("target_brand_mentioned", False))
        entity_has_target = any(
            e.is_target_brand or e.entity_name.strip().lower() == target_brand_name_lower
            for e in resp_entities
        )
        if meta_mentioned or entity_has_target:
            target_mentioned_response_ids.add(ai_resp.id)

    # ── 4. PART 2: Competitor Intelligence ────────────────────────────────
    competitor_appearances: Dict[str, Dict[str, any]] = defaultdict(
        lambda: {"responses": set(), "mention_count": 0, "positions": []}
    )

    for _, ai_resp, _ in analyzed_runs:
        resp_entities = entities_by_response[ai_resp.id]
        for e in resp_entities:
            c_name = e.entity_name.strip()
            c_name_lower = c_name.lower()
            if e.is_target_brand or c_name_lower == target_brand_name_lower:
                continue
            if e.entity_type and e.entity_type.strip().lower() not in RELEVANT_ENTITY_TYPES:
                continue

            entry = competitor_appearances[c_name]
            entry["responses"].add(ai_resp.id)
            entry["mention_count"] += 1
            if e.mention_position and e.mention_position >= 1:
                entry["positions"].append(e.mention_position)

    competitors_list: List[CompetitorInsight] = []
    for c_name, data in competitor_appearances.items():
        resp_count = len(data["responses"])
        vis_pct = round((resp_count / total_analyzed) * 100.0, 2)
        avg_pos = (
            round(sum(data["positions"]) / len(data["positions"]), 2)
            if data["positions"]
            else None
        )
        competitors_list.append(
            CompetitorInsight(
                name=c_name,
                visibility_percentage=min(100.0, max(0.0, vis_pct)),
                mention_count=data["mention_count"],
                average_position=avg_pos,
            )
        )

    # Sort competitors by visibility percentage DESC, then mention count DESC
    competitors_list.sort(key=lambda c: (c.visibility_percentage, c.mention_count), reverse=True)

    # ── 5. PART 3: Source Intelligence & Source Gaps ──────────────────────
    citations: List[Citation] = (
        db.query(Citation)
        .filter(Citation.ai_response_id.in_(ai_response_ids))
        .all()
    )

    # Fetch referenced sources
    source_ids = {c.source_id for c in citations}
    sources: List[Source] = (
        db.query(Source)
        .filter(Source.id.in_(source_ids))
        .all()
    )
    source_by_id: Dict[uuid.UUID, Source] = {s.id: s for s in sources}

    # Identify sources associated with target-brand-mentioned responses
    target_source_ids: Set[uuid.UUID] = {
        c.source_id for c in citations if c.ai_response_id in target_mentioned_response_ids
    }

    # Map each response to competitors present in it
    competitors_by_response: Dict[uuid.UUID, Set[str]] = defaultdict(set)
    for resp_id, ents in entities_by_response.items():
        for e in ents:
            if not e.is_target_brand and e.entity_name.strip().lower() != target_brand_name_lower:
                competitors_by_response[resp_id].add(e.entity_name.strip())

    # Find sources appearing in competitor responses but NOT in target responses
    competitor_sources_map: Dict[uuid.UUID, Dict[str, any]] = defaultdict(
        lambda: {"count": 0, "competitors": set()}
    )

    for c in citations:
        if c.source_id not in target_source_ids and c.source_id in source_by_id:
            competitors_in_run = competitors_by_response.get(c.ai_response_id, set())
            competitor_sources_map[c.source_id]["count"] += 1
            competitor_sources_map[c.source_id]["competitors"].update(competitors_in_run)

    source_gaps_list: List[SourceGapInsight] = []
    for s_id, gap_data in competitor_sources_map.items():
        src = source_by_id[s_id]
        comp_assoc = ", ".join(sorted(gap_data["competitors"])) if gap_data["competitors"] else None
        source_gaps_list.append(
            SourceGapInsight(
                domain=src.domain,
                url=src.url,
                title=src.title,
                citation_frequency=gap_data["count"],
                competitor_association=comp_assoc,
            )
        )

    # Sort source gaps by citation frequency DESC
    source_gaps_list.sort(key=lambda s: s.citation_frequency, reverse=True)

    # ── 6. PART 4: Topic / Category Gaps ──────────────────────────────────
    runs_by_category: Dict[str, List[Tuple[SearchRun, AIResponse, dict]]] = defaultdict(list)
    for item in analyzed_runs:
        sr = item[0]
        cat = (sr.prompt.category.strip() if sr.prompt and sr.prompt.category else "General") or "General"
        runs_by_category[cat].append(item)

    topic_gaps_list: List[TopicGapInsight] = []
    for cat, cat_items in runs_by_category.items():
        cat_total = len(cat_items)
        cat_target_mentions = sum(
            1 for _, ai_resp, _ in cat_items if ai_resp.id in target_mentioned_response_ids
        )
        cat_target_vis = round((cat_target_mentions / cat_total) * 100.0, 2)

        # Competitor performance in this category
        cat_comp_mentions: Dict[str, int] = defaultdict(int)
        for _, ai_resp, _ in cat_items:
            for comp_name in competitors_by_response.get(ai_resp.id, set()):
                cat_comp_mentions[comp_name] += 1

        if cat_comp_mentions:
            top_comp_name, top_comp_count = max(cat_comp_mentions.items(), key=lambda x: x[1])
            top_comp_vis = round((top_comp_count / cat_total) * 100.0, 2)
        else:
            top_comp_name, top_comp_vis = "None", 0.0

        # Topic gap exists if competitor visibility exceeds target brand visibility
        if top_comp_vis > cat_target_vis or (cat_target_vis <= 50.0 and top_comp_vis >= 50.0):
            topic_gaps_list.append(
                TopicGapInsight(
                    category=cat,
                    target_visibility=cat_target_vis,
                    strongest_competitor=top_comp_name,
                    competitor_visibility=top_comp_vis,
                )
            )

    topic_gaps_list.sort(key=lambda tg: (tg.competitor_visibility - tg.target_visibility), reverse=True)

    # ── 7. PART 5: Root-Cause Engine ──────────────────────────────────────
    root_causes_list: List[RootCauseItem] = []
    vis_val = metric_record.visibility_score or 0.0
    avg_pos_val = metric_record.average_position
    sov_val = metric_record.share_of_voice
    sent_val = metric_record.sentiment_score

    # Check 1: LOW_VISIBILITY
    if vis_val < 50.0:
        sev = "high" if vis_val < 30.0 else "medium"
        root_causes_list.append(
            RootCauseItem(
                type="LOW_VISIBILITY",
                severity=sev,
                evidence=[
                    f"Target brand visibility is {vis_val}% across {total_analyzed} analyzed response(s).",
                    f"Target brand was mentioned in {len(target_mentioned_response_ids)} of {total_analyzed} responses.",
                ],
                explanation="The brand is absent from the majority of AI search responses, severely limiting organic discoverability.",
            )
        )

    # Check 2: WEAK_COMPETITOR_POSITION
    if avg_pos_val is not None and competitors_list and competitors_list[0].average_position is not None:
        top_comp = competitors_list[0]
        if avg_pos_val > top_comp.average_position:
            sev = "high" if avg_pos_val >= 3.0 else "medium"
            root_causes_list.append(
                RootCauseItem(
                    type="WEAK_COMPETITOR_POSITION",
                    severity=sev,
                    evidence=[
                        f"Target brand average mention position is {avg_pos_val}.",
                        f"Leading competitor '{top_comp.name}' appears earlier at average position {top_comp.average_position}.",
                    ],
                    explanation="When mentioned, the brand appears later in AI responses after competitors have already captured reader attention.",
                )
            )

    # Check 3: LOW_SHARE_OF_VOICE
    if sov_val is not None and sov_val < 35.0:
        sev = "high" if sov_val < 20.0 else "medium"
        evidence_items = [
            f"Target brand holds only {sov_val}% share of voice among detected brand entities.",
        ]
        if competitors_list:
            evidence_items.append(
                f"Top competitor '{competitors_list[0].name}' captures {competitors_list[0].visibility_percentage}% visibility with {competitors_list[0].mention_count} mentions."
            )
        root_causes_list.append(
            RootCauseItem(
                type="LOW_SHARE_OF_VOICE",
                severity=sev,
                evidence=evidence_items,
                explanation="Competitor entities dominate market discussions in AI responses, reducing the target brand's relative authority.",
            )
        )

    # Check 4: SOURCE_COVERAGE_GAP
    if source_gaps_list:
        sev = "high" if len(source_gaps_list) >= 3 else "medium"
        gap_domains = [sg.domain for sg in source_gaps_list if sg.domain]
        domain_sample = ", ".join(gap_domains[:3]) if gap_domains else "authority review sites"
        root_causes_list.append(
            RootCauseItem(
                type="SOURCE_COVERAGE_GAP",
                severity=sev,
                evidence=[
                    f"Identified {len(source_gaps_list)} source gap(s) cited for competitors but missing target brand coverage.",
                    f"Top competitor-cited domains lacking target brand citations: {domain_sample}.",
                ],
                explanation="AI search engines rely on external web citations that cite competitor solutions but lack references to the target brand.",
            )
        )

    # Check 5: TOPIC_COVERAGE_GAP
    if topic_gaps_list:
        sev = "high" if any(tg.competitor_visibility - tg.target_visibility >= 40.0 for tg in topic_gaps_list) else "medium"
        evidence_items = [
            f"In '{tg.category}', competitor '{tg.strongest_competitor}' has {tg.competitor_visibility}% visibility vs target brand at {tg.target_visibility}%."
            for tg in topic_gaps_list[:2]
        ]
        root_causes_list.append(
            RootCauseItem(
                type="TOPIC_COVERAGE_GAP",
                severity=sev,
                evidence=evidence_items,
                explanation="The brand has weak representation in specific query topics where competitors have established market dominance.",
            )
        )

    # Check 6: LOW_SENTIMENT
    if sent_val is not None and sent_val < 60.0:
        sev = "high" if sent_val < 40.0 else "medium"
        root_causes_list.append(
            RootCauseItem(
                type="LOW_SENTIMENT",
                severity=sev,
                evidence=[
                    f"Target brand average sentiment score is {sent_val}/100 across evaluated mentions.",
                ],
                explanation="AI responses portray the brand with neutral to critical framing, diminishing recommendation appeal.",
            )
        )

    # Check 7: WEAK_CITATION_PRESENCE
    if len(target_source_ids) == 0 and len(source_ids) > 0:
        root_causes_list.append(
            RootCauseItem(
                type="WEAK_CITATION_PRESENCE",
                severity="high",
                evidence=[
                    "0 citations were attributed to the target brand, despite web grounding returning citations for competitor solutions.",
                ],
                explanation="Grounding algorithms are unable to find or verify claims on target brand web properties.",
            )
        )

    # ── 8. PART 6: Gemini Executive Diagnosis ──────────────────────────────
    diagnosis_text = _generate_gemini_diagnosis(
        target_brand_name=target_brand_name,
        target_date=target_d,
        metrics_summary=metrics_summary,
        competitors=competitors_list,
        source_gaps=source_gaps_list,
        topic_gaps=topic_gaps_list,
        root_causes=root_causes_list,
    )

    return ProjectInsightsResponse(
        project_id=project_id,
        brand=target_brand_name,
        project_name=project.name,
        metric_date=target_d,
        metrics=metrics_summary,
        competitors=competitors_list,
        source_gaps=source_gaps_list,
        topic_gaps=topic_gaps_list,
        root_causes=root_causes_list,
        diagnosis=diagnosis_text,
    )


def _generate_gemini_diagnosis(
    target_brand_name: str,
    target_date: date,
    metrics_summary: ProjectMetricsSummary,
    competitors: List[CompetitorInsight],
    source_gaps: List[SourceGapInsight],
    topic_gaps: List[TopicGapInsight],
    root_causes: List[RootCauseItem],
) -> str:
    """Generate concise executive diagnosis using exactly ONE Gemini structured call with fallback."""
    # Build compact deterministic payload
    top_competitors_str = (
        ", ".join([f"{c.name} ({c.visibility_percentage}%)" for c in competitors[:3]])
        if competitors
        else "None detected"
    )
    source_gaps_str = (
        f"{len(source_gaps)} gap domains identified ({', '.join([s.domain for s in source_gaps[:3] if s.domain])})"
        if source_gaps
        else "None"
    )
    topic_gaps_str = (
        ", ".join([f"{tg.category} (competitor {tg.strongest_competitor} {tg.competitor_visibility}% vs {tg.target_visibility}%)" for tg in topic_gaps[:2]])
        if topic_gaps
        else "None"
    )
    root_causes_str = (
        "; ".join([f"{rc.type} ({rc.severity}): {rc.explanation}" for rc in root_causes[:3]])
        if root_causes
        else "No critical root causes detected."
    )

    prompt = f"""You are an AI Search Visibility Intelligence analyst.
Analyze the following empirical data derived strictly from PostgreSQL for target brand "{target_brand_name}" on {target_date}:

DETERMINISTIC METRICS:
- Visibility Score: {metrics_summary.visibility_score}%
- Average Mention Position: {metrics_summary.average_position}
- Sentiment Score: {metrics_summary.sentiment_score}/100
- Share of Voice: {metrics_summary.share_of_voice}%
- Mention Count: {metrics_summary.mention_count}

COMPETITOR LANDSCAPE:
- Top Competitors: {top_competitors_str}

SOURCE & TOPIC GAPS:
- Source Gaps: {source_gaps_str}
- Topic Gaps: {topic_gaps_str}

IDENTIFIED ROOT CAUSES:
- {root_causes_str}

INSTRUCTIONS:
1. Provide a concise 2-4 sentence executive diagnosis explaining WHY the target brand has its current visibility.
2. Prioritize the most critical root cause that requires immediate action.
3. Reference ONLY the supplied numerical facts and evidence. Do not invent any outside statistics, sources, or competitors.
4. Output valid structured JSON matching the schema.
"""

    try:
        client = _get_client()
        model = settings.GEMINI_MODEL
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": DiagnosisOutput,
            },
        )
        raw_text = getattr(response, "text", None)
        if raw_text:
            parsed = json.loads(raw_text)
            validated = DiagnosisOutput.model_validate(parsed)
            if validated.diagnosis and validated.diagnosis.strip():
                return validated.diagnosis.strip()
    except Exception as exc:
        logger.warning(
            "Gemini diagnosis call failed; using deterministic fallback: %s", exc
        )

    # ── Resilient Deterministic Fallback ───────────────────────────────────
    if root_causes:
        top_cause = root_causes[0]
        return (
            f"Target brand '{target_brand_name}' recorded a visibility score of {metrics_summary.visibility_score}% "
            f"with {metrics_summary.share_of_voice}% share of voice on {target_date}. "
            f"The primary root cause is {top_cause.type.replace('_', ' ').title()} ({top_cause.severity} severity): "
            f"{top_cause.explanation}"
        )
    else:
        return (
            f"Target brand '{target_brand_name}' maintains steady performance with a visibility score of "
            f"{metrics_summary.visibility_score}% and {metrics_summary.share_of_voice}% share of voice on {target_date}."
        )
