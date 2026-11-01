"""Step 8 Live Test Script — AI Search Visibility Metrics.

Validates all 12 testing requirements:
1. Calculate metrics for an existing project with real data.
2. Verify the metrics record in PostgreSQL.
3. Verify all metric values are within sensible ranges.
4. Verify visibility_score is 0–100.
5. Verify sentiment_score is 0–100 or null.
6. Verify share_of_voice is 0–100.
7. Verify average_position is null when the brand is never mentioned.
8. Run calculation twice and confirm no duplicate (project_id, metric_date) record is created.
9. Verify GET historical metrics returns list sorted by metric_date descending.
10. Verify invalid project_id returns 404 on calculate and get history.
11. Verify existing Step 5, Step 6, and Step 7 functionality still works.
12. Verify /api/v1/health still works.
"""
import json
import sys
import uuid
import urllib.request
import urllib.error
from datetime import date

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.core.database import SessionLocal
from app.models.company import Company
from app.models.brand import Brand
from app.models.project import Project
from app.models.prompt import Prompt
from app.models.search_run import SearchRun
from app.models.ai_response import AIResponse
from app.models.entity import Entity
from app.models.metric import Metric

BASE = "http://127.0.0.1:8000"
PASS = "\u2714 PASS"
FAIL = "\u2718 FAIL"


def get(path: str):
    req = urllib.request.Request(f"{BASE}{path}", method="GET")
    try:
        r = urllib.request.urlopen(req, timeout=15)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def post(path: str, body=None):
    data = json.dumps(body).encode() if body is not None else b""
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        r = urllib.request.urlopen(req, timeout=30)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def section(title: str):
    print(f"\n{'=' * 66}")
    print(f"  {title}")
    print(f"{'=' * 66}")


def main():
    print("\n" + "=" * 66)
    print("STEP 8 VERIFICATION SUITE — AI Search Visibility Metrics")
    print("=" * 66)

    # ── TEST 12: Health Check ──────────────────────────────────────────────
    section("TEST 12: /api/v1/health (Requirement 12)")
    sc, h = get("/api/v1/health")
    assert sc == 200, f"Health check failed with {sc}"
    assert h.get("status") == "ok", f"Unexpected health body: {h}"
    print(f"{PASS}  Health status: {h['status']}")

    # ── Find or verify existing project with analyzed search runs ──────────
    db = SessionLocal()
    existing_project_id = None
    target_brand_name = None
    existing_run_id = None
    try:
        # Find a project with analyzed search runs
        projects = db.query(Project).all()
        for p in projects:
            for sr in p.search_runs:
                if sr.status == "completed" and sr.ai_response:
                    meta = sr.ai_response.response_metadata or {}
                    if "analysis" in meta:
                        existing_project_id = str(p.id)
                        target_brand_name = p.brand.name
                        existing_run_id = str(sr.id)
                        break
            if existing_project_id:
                break
    finally:
        db.close()

    print(f"\nFound existing analyzed project: {existing_project_id} (Brand: {target_brand_name})")
    assert existing_project_id is not None, "No existing project with analyzed search runs found!"

    # ── TEST 1: Calculate metrics for existing project ─────────────────────
    section("TEST 1: Calculate metrics for an existing project (Requirement 1)")
    sc, res = post(f"/api/v1/projects/{existing_project_id}/metrics/calculate")
    print(f"HTTP Status: {sc}")
    print(f"Calculated Metrics Response:")
    for k, v in res.items():
        print(f"  {k}: {v}")
    assert sc == 200, f"Calculate failed: {res}"
    assert res["project_id"] == existing_project_id
    assert "metric_date" in res
    print(f"{PASS}  1: Successfully calculated metrics for project {existing_project_id}")

    # ── TEST 2: Verify the metrics record in PostgreSQL ────────────────────
    section("TEST 2: Verify the metrics record in PostgreSQL (Requirement 2)")
    db = SessionLocal()
    try:
        metric_rec = (
            db.query(Metric)
            .filter(Metric.project_id == uuid.UUID(existing_project_id))
            .first()
        )
        assert metric_rec is not None, "No metric record found in database"
        print(f"PostgreSQL Record Found:")
        print(f"  id              : {metric_rec.id}")
        print(f"  project_id      : {metric_rec.project_id}")
        print(f"  metric_date     : {metric_rec.metric_date}")
        print(f"  visibility_score: {metric_rec.visibility_score}")
        print(f"  average_position: {metric_rec.average_position}")
        print(f"  sentiment_score : {metric_rec.sentiment_score}")
        print(f"  share_of_voice  : {metric_rec.share_of_voice}")
        print(f"  mention_count   : {metric_rec.mention_count}")
        print(f"  created_at      : {metric_rec.created_at}")
        print(f"{PASS}  2: Metrics record confirmed directly in PostgreSQL `metrics` table")
    finally:
        db.close()

    # ── TEST 3: Verify sensible ranges ─────────────────────────────────────
    section("TEST 3: Verify all metric values are within sensible ranges (Requirement 3)")
    vis = res["visibility_score"]
    pos = res["average_position"]
    sent = res["sentiment_score"]
    sov = res["share_of_voice"]
    cnt = res["mention_count"]

    assert isinstance(vis, (int, float)), f"visibility_score is not numeric: {vis}"
    assert isinstance(sov, (int, float)), f"share_of_voice is not numeric: {sov}"
    assert isinstance(cnt, int), f"mention_count is not integer: {cnt}"
    assert cnt >= 0, f"mention_count is negative: {cnt}"
    if pos is not None:
        assert isinstance(pos, (int, float)) and pos >= 1.0, f"average_position invalid: {pos}"
    if sent is not None:
        assert isinstance(sent, (int, float)), f"sentiment_score is not numeric: {sent}"

    print(f"{PASS}  3: All metric values within valid types and sensible ranges")

    # ── TEST 4: Verify visibility_score is 0–100 ───────────────────────────
    section("TEST 4: Verify visibility_score is 0–100 (Requirement 4)")
    assert 0.0 <= vis <= 100.0, f"visibility_score out of range [0, 100]: {vis}"
    print(f"{PASS}  4: visibility_score is {vis}% (valid range: 0–100)")

    # ── TEST 5: Verify sentiment_score is 0–100 or null ───────────────────
    section("TEST 5: Verify sentiment_score is 0–100 or null (Requirement 5)")
    if sent is not None:
        assert 0.0 <= sent <= 100.0, f"sentiment_score out of range [0, 100]: {sent}"
        print(f"{PASS}  5: sentiment_score is {sent} (valid range: 0–100)")
    else:
        print(f"{PASS}  5: sentiment_score is null (valid: brand not mentioned)")

    # ── TEST 6: Verify share_of_voice is 0–100 ─────────────────────────────
    section("TEST 6: Verify share_of_voice is 0–100 (Requirement 6)")
    assert 0.0 <= sov <= 100.0, f"share_of_voice out of range [0, 100]: {sov}"
    print(f"{PASS}  6: share_of_voice is {sov}% (valid range: 0–100)")

    # ── TEST 7: Verify average_position is null when brand is never mentioned
    section("TEST 7: average_position is null when brand never mentioned (Requirement 7)")
    # Create an isolated test project with an unmentioned brand
    db = SessionLocal()
    unmentioned_proj_id = None
    try:
        co = Company(name=f"UnmentionedCo_{uuid.uuid4().hex[:6]}", website="https://unmentioned.test")
        db.add(co)
        db.flush()
        br = Brand(company_id=co.id, name="PhantomBrandGhost", website="https://ghost.test", industry="Security")
        db.add(br)
        db.flush()
        pr = Project(company_id=co.id, brand_id=br.id, name="Ghost Brand Benchmark")
        db.add(pr)
        db.flush()
        pm = Prompt(project_id=pr.id, prompt_text="What are top security suites?")
        db.add(pm)
        db.flush()
        sr = SearchRun(
            prompt_id=pm.id,
            project_id=pr.id,
            engine="google",
            model="gemini-robotics-er-2-preview",
            status="completed",
        )
        db.add(sr)
        db.flush()
        ai = AIResponse(
            search_run_id=sr.id,
            response_text="Top suites include Norton and McAfee.",
            response_metadata={
                "analysis": {
                    "target_brand_name": "PhantomBrandGhost",
                    "target_brand_mentioned": False,
                    "mention_count": 0,
                    "positions": [],
                    "sentiment": {"label": "neutral", "score": 50},
                    "analyzed_at": "2026-09-14T10:00:00Z",
                }
            },
        )
        db.add(ai)
        db.flush()
        # Add competitor entities
        e1 = Entity(ai_response_id=ai.id, entity_name="Norton", entity_type="brand", is_target_brand=False, mention_position=1)
        e2 = Entity(ai_response_id=ai.id, entity_name="McAfee", entity_type="brand", is_target_brand=False, mention_position=2)
        db.add_all([e1, e2])
        db.commit()
        unmentioned_proj_id = str(pr.id)
    finally:
        db.close()

    sc_ghost, res_ghost = post(f"/api/v1/projects/{unmentioned_proj_id}/metrics/calculate")
    assert sc_ghost == 200, f"Ghost calculate failed: {res_ghost}"
    print(f"Ghost project metrics:")
    print(f"  visibility_score : {res_ghost['visibility_score']}")
    print(f"  average_position : {res_ghost['average_position']}")
    print(f"  sentiment_score  : {res_ghost['sentiment_score']}")
    print(f"  share_of_voice   : {res_ghost['share_of_voice']}")
    print(f"  mention_count    : {res_ghost['mention_count']}")

    assert res_ghost["visibility_score"] == 0.0, "visibility_score should be 0.0"
    assert res_ghost["average_position"] is None, "average_position must be null when unmentioned"
    assert res_ghost["sentiment_score"] is None, "sentiment_score must be null when unmentioned"
    assert res_ghost["share_of_voice"] == 0.0, "share_of_voice should be 0.0"
    assert res_ghost["mention_count"] == 0, "mention_count should be 0"
    print(f"{PASS}  7: average_position is null and sentiment_score is null when target brand is unmentioned")

    # ── TEST 8: Idempotent recalculation (no duplicate rows) ───────────────
    section("TEST 8: Duplicate / Recalculation test (Requirement 8)")
    db = SessionLocal()
    try:
        count_before = (
            db.query(Metric)
            .filter(Metric.project_id == uuid.UUID(existing_project_id))
            .count()
        )
    finally:
        db.close()

    # Recalculate again on the same project
    sc_recalc, res_recalc = post(f"/api/v1/projects/{existing_project_id}/metrics/calculate")
    assert sc_recalc == 200, f"Recalculate failed: {res_recalc}"

    db = SessionLocal()
    try:
        count_after = (
            db.query(Metric)
            .filter(Metric.project_id == uuid.UUID(existing_project_id))
            .count()
        )
    finally:
        db.close()

    print(f"Metric records before recalculate: {count_before}")
    print(f"Metric records after recalculate : {count_after}")
    assert count_before == count_after, f"Duplicate record created: {count_before} != {count_after}"
    print(f"{PASS}  8: Idempotent recalculation confirmed — row count unchanged ({count_after})")

    # ── TEST 9: GET historical metrics ─────────────────────────────────────
    section("TEST 9: GET historical metrics (Requirement 9)")
    sc_hist, hist = get(f"/api/v1/projects/{existing_project_id}/metrics")
    assert sc_hist == 200, f"GET metrics history failed: {hist}"
    assert isinstance(hist, list), f"Expected list of metrics, got {type(hist)}"
    assert len(hist) >= 1, "Expected at least 1 historical metric record"
    print(f"Historical records returned: {len(hist)}")
    for i, m in enumerate(hist):
        print(f"  [{i+1}] Date: {m['metric_date']}, Visibility: {m['visibility_score']}%, SOV: {m['share_of_voice']}%, Mentions: {m['mention_count']}")

    # Check ordering descending by metric_date
    dates = [m["metric_date"] for m in hist]
    assert dates == sorted(dates, reverse=True), f"Dates not ordered descending: {dates}"
    print(f"{PASS}  9: Historical metrics retrieved successfully, ordered by metric_date descending")

    # ── TEST 10: Invalid project_id returns 404 ───────────────────────────
    section("TEST 10: Invalid project_id returns 404 (Requirement 10)")
    bogus_id = uuid.uuid4()
    sc_bogus_post, res_bogus_post = post(f"/api/v1/projects/{bogus_id}/metrics/calculate")
    assert sc_bogus_post == 404, f"Expected 404 on calculate with bogus project, got {sc_bogus_post}"
    print(f"  POST calculate with invalid UUID returned {sc_bogus_post} ({res_bogus_post.get('detail')})")

    sc_bogus_get, res_bogus_get = get(f"/api/v1/projects/{bogus_id}/metrics")
    assert sc_bogus_get == 404, f"Expected 404 on get history with bogus project, got {sc_bogus_get}"
    print(f"  GET history with invalid UUID returned {sc_bogus_get} ({res_bogus_get.get('detail')})")
    print(f"{PASS}  10: Invalid project_id returns 404 for both endpoints")

    # ── TEST 11: Existing Step 5, 6, 7 functionality still works ───────────
    section("TEST 11: Step 5, 6, 7 compatibility checks (Requirement 11)")
    # Test Step 5: project and prompt retrieval
    sc_pr, pr_data = get(f"/api/v1/projects/{existing_project_id}")
    assert sc_pr == 200, f"Step 5 project retrieval failed: {sc_pr}"
    print(f"  Step 5 project retrieval: 200 OK (project={pr_data.get('name')}, status={pr_data.get('status')})")

    # Test Step 7: extract-sources endpoint
    sc_sources, sources_data = post(f"/api/v1/search-runs/{existing_run_id}/extract-sources")
    assert sc_sources == 200, f"Step 7 extract-sources failed: {sc_sources}"
    print(f"  Step 7 extract-sources: 200 OK (sources={sources_data.get('sources_count')}, citations={sources_data.get('citations_count')})")

    # Test Step 6: analyze endpoint
    sc_ana, ana_data = post(f"/api/v1/search-runs/{existing_run_id}/analyze")
    assert sc_ana == 200, f"Step 6 analyze failed: {sc_ana}"
    print(f"  Step 6 analyze endpoint: 200 OK (target_brand={ana_data.get('target_brand')}, entities={ana_data.get('entities_count')})")
    print(f"{PASS}  11: Steps 5, 6, and 7 remain fully functional with zero regressions")

    # ── Summary ────────────────────────────────────────────────────────────
    print("\n" + "=" * 66)
    print("STEP 8 VERIFICATION SUITE — ALL 12 REQUIREMENTS PASSED")
    print("=" * 66)
    print(f"{PASS}  1: Calculated metrics for existing project")
    print(f"{PASS}  2: Verified metrics record in PostgreSQL")
    print(f"{PASS}  3: All metric values within sensible ranges")
    print(f"{PASS}  4: visibility_score is 0–100")
    print(f"{PASS}  5: sentiment_score is 0–100 or null")
    print(f"{PASS}  6: share_of_voice is 0–100")
    print(f"{PASS}  7: average_position is null when brand is never mentioned")
    print(f"{PASS}  8: Recalculation confirms no duplicate (project_id, metric_date) records")
    print(f"{PASS}  9: GET historical metrics sorted descending")
    print(f"{PASS} 10: Invalid project_id returns 404")
    print(f"{PASS} 11: Steps 5, 6, and 7 functionality fully preserved")
    print(f"{PASS} 12: /api/v1/health operational")
    print("\nStep 8 implementation successfully completed and verified.")


if __name__ == "__main__":
    main()
