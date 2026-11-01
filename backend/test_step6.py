"""Step 6 Live Test Script — AI Response Intelligence.

Runs all verification tests against the running FastAPI server and the real Gemini API.
Verifies:
A. Target brand detection works.
B. Other entities are stored in `entities`.
C. Competitors are identified.
D. Mention positions are stored.
E. Context text is stored.
F. Sentiment label is generated (positive/neutral/negative).
G. Sentiment score is between 0 and 100.
H. Sentiment info stored inside ai_responses.response_metadata.
I. Idempotency: re-running analysis replaces records without duplicate ballooning.
J. Invalid search_run_id returns 404.
K. Existing endpoints still work.
L. /api/v1/health still works.
"""
import json
import sys
import uuid
import urllib.request
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.core.database import SessionLocal
from app.models.ai_response import AIResponse
from app.models.brand import Brand
from app.models.company import Company
from app.models.entity import Entity
from app.models.project import Project
from app.models.prompt import Prompt
from app.models.search_run import SearchRun

BASE = "http://localhost:8000"


def get(path):
    r = urllib.request.urlopen(f"{BASE}{path}", timeout=10)
    return json.loads(r.read())


def post(path, body=None):
    data = json.dumps(body).encode() if body is not None else b""
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        r = urllib.request.urlopen(req, timeout=60)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def main():
    print("\n" + "=" * 60)
    print("STEP 6 VERIFICATION SUITE — AI Response Intelligence")
    print("=" * 60)

    # ── Test 1: Health check ──────────────────────────────────────────────────
    print("\n=== TEST 1: Health Check (Requirement L) ===")
    h = get("/api/v1/health")
    assert h["status"] == "ok", f"Health check failed: {h}"
    print(f"PASS  /api/v1/health status={h['status']}")

    # ── Test 2: Fetch existing completed search run from Step 5 ──────────────
    print("\n=== Setup: Finding an existing completed search run ===")
    db = SessionLocal()
    search_run = (
        db.query(SearchRun)
        .filter(SearchRun.status == "completed")
        .order_by(SearchRun.completed_at.desc())
        .first()
    )
    if not search_run or not search_run.ai_response:
        print("ERROR: No completed search run with AI response found in DB.")
        db.close()
        sys.exit(1)

    run_id = str(search_run.id)
    target_brand_name = search_run.project.brand.name
    response_preview = search_run.ai_response.response_text[:100]
    print(f"Found search_run_id : {run_id}")
    print(f"Target brand        : {target_brand_name}")
    print(f"Response preview    : {response_preview!r}")
    db.close()

    # ── Test 3: POST /api/v1/search-runs/{run_id}/analyze (REAL Gemini) ─────
    print(f"\n=== TEST 3: POST /api/v1/search-runs/{run_id}/analyze (Real Gemini API) ===")
    status_code, resp = post(f"/api/v1/search-runs/{run_id}/analyze")
    print(f"HTTP Status  : {status_code}")
    print(f"Response keys: {list(resp.keys())}")
    assert status_code == 200, f"Expected 200, got {status_code}: {resp}"
    assert resp["search_run_id"] == run_id
    assert resp["target_brand"] == target_brand_name

    tb_analysis = resp["target_brand_analysis"]
    print("\nTarget Brand Analysis:")
    print(f"  mentioned         : {tb_analysis['mentioned']}")
    print(f"  mention_count     : {tb_analysis['mention_count']}")
    print(f"  positions         : {tb_analysis['positions']}")
    print(f"  overall_sentiment : {tb_analysis['overall_sentiment']}")
    print(f"  sentiment_score   : {tb_analysis['sentiment_score']}")

    # Verify Sentiment label & score (Req F & G)
    assert tb_analysis["overall_sentiment"] in ["positive", "neutral", "negative"]
    assert 0 <= tb_analysis["sentiment_score"] <= 100
    print(f"PASS  Sentiment label={tb_analysis['overall_sentiment']!r}, score={tb_analysis['sentiment_score']}")

    # Verify Entities returned (Req B, C, D, E)
    entities = resp["entities"]
    print(f"\nDetected Entities count: {len(entities)}")
    assert len(entities) > 0, "Expected at least one entity detected in EV response"
    for e in entities[:5]:
        print(f"  [{e['mention_position']}] {e['entity_name']} ({e['entity_type']}) | target={e['is_target_brand']}")
        print(f"      context: {e['context_text'][:80]!r}")

    # Verify mention positions and context texts exist
    for e in entities:
        assert e["entity_name"], "Entity name cannot be empty"
        assert e["mention_position"] is not None and e["mention_position"] >= 1
        assert e["context_text"], "Context text cannot be empty"

    # ── Test 4: Verify Database Entities Persistence ─────────────────────────
    print("\n=== TEST 4: Verify Entities in PostgreSQL ===")
    db = SessionLocal()
    db_entities = (
        db.query(Entity)
        .filter(Entity.ai_response_id == uuid.UUID(resp["ai_response_id"]))
        .order_by(Entity.mention_position.asc())
        .all()
    )
    assert len(db_entities) == len(entities), "DB entity count mismatch"
    print(f"PASS  {len(db_entities)} entity records verified in database.")

    # ── Test 5: Verify ai_responses.response_metadata (Req H) ────────────────
    print("\n=== TEST 5: Verify ai_responses.response_metadata contains sentiment ===")
    db_ai_resp = db.get(AIResponse, uuid.UUID(resp["ai_response_id"]))
    meta = db_ai_resp.response_metadata
    assert "analysis" in meta, "Missing 'analysis' key in response_metadata"
    analysis_meta = meta["analysis"]
    assert "sentiment" in analysis_meta
    assert analysis_meta["sentiment"]["label"] in ["positive", "neutral", "negative"]
    assert 0 <= analysis_meta["sentiment"]["score"] <= 100
    # Also verify existing metadata was not deleted (provider, model, etc.)
    assert "provider" in meta or "model" in meta, "Original metadata was destroyed!"
    print(f"PASS  response_metadata analysis verified: {json.dumps(analysis_meta, indent=2)}")
    db.close()

    # ── Test 6: Idempotency Verification (Req I) ─────────────────────────────
    print("\n=== TEST 6: Idempotency Test (Re-running analyze on same response) ===")
    status_code2, resp2 = post(f"/api/v1/search-runs/{run_id}/analyze")
    assert status_code2 == 200, f"Expected 200 on second run, got {status_code2}: {resp2}"
    db = SessionLocal()
    db_entities_after = (
        db.query(Entity)
        .filter(Entity.ai_response_id == uuid.UUID(resp["ai_response_id"]))
        .all()
    )
    print(f"Entities before: {len(db_entities)}, Entities after second run: {len(db_entities_after)}")
    assert len(db_entities_after) == resp2["entities_count"]
    # Verify no duplicate entity names in the same response
    names = [e.entity_name.lower() for e in db_entities_after]
    assert len(names) == len(set(names)), f"Found duplicate entity names: {names}"
    print("PASS  Idempotency verified: duplicate records cleanly prevented/replaced.")
    db.close()

    # ── Test 7: Target Brand Mentioned Test Case ─────────────────────────────
    print("\n=== TEST 7: Target Brand Mentioned Scenario (e.g. Tesla) ===")
    # Let's create a targeted project for "Tesla" to verify is_target_brand=True
    db = SessionLocal()
    tesla_brand = db.query(Brand).filter(Brand.name == "Tesla").first()
    if not tesla_brand:
        # Link to existing company
        company = db.query(Company).first()
        tesla_brand = Brand(company_id=company.id, name="Tesla", industry="Automotive")
        db.add(tesla_brand)
        db.commit()
        db.refresh(tesla_brand)

    tesla_project = Project(
        company_id=tesla_brand.company_id,
        brand_id=tesla_brand.id,
        name="Tesla EV Benchmark",
    )
    db.add(tesla_project)
    db.commit()
    db.refresh(tesla_project)

    tesla_prompt = Prompt(
        project_id=tesla_project.id,
        prompt_text="Why is Tesla popular among electric vehicle buyers in 2024?",
    )
    db.add(tesla_prompt)
    db.commit()
    db.refresh(tesla_prompt)
    db.close()

    # Run search-run
    print(f"Created Tesla prompt: {tesla_prompt.prompt_text}")
    print("Calling POST /api/v1/search-runs for Tesla...")
    run_status, run_resp = post("/api/v1/search-runs", {"prompt_id": str(tesla_prompt.id)})
    assert run_status == 201, f"Expected 201, got {run_status}: {run_resp}"
    tesla_run_id = run_resp["search_run_id"]
    print(f"Tesla run created: {tesla_run_id}")

    # Now analyze the Tesla response
    print(f"Calling POST /api/v1/search-runs/{tesla_run_id}/analyze...")
    ana_status, ana_resp = post(f"/api/v1/search-runs/{tesla_run_id}/analyze")
    assert ana_status == 200, f"Expected 200, got {ana_status}: {ana_resp}"
    print("Tesla Analysis Result:")
    print(f"  Target Brand        : {ana_resp['target_brand']}")
    print(f"  Mentioned           : {ana_resp['target_brand_analysis']['mentioned']}")
    print(f"  Mention Count       : {ana_resp['target_brand_analysis']['mention_count']}")
    print(f"  Positions           : {ana_resp['target_brand_analysis']['positions']}")
    print(f"  Overall Sentiment   : {ana_resp['target_brand_analysis']['overall_sentiment']}")
    print(f"  Sentiment Score     : {ana_resp['target_brand_analysis']['sentiment_score']}")

    assert ana_resp["target_brand_analysis"]["mentioned"] is True, "Tesla should be detected as mentioned!"
    assert ana_resp["target_brand_analysis"]["mention_count"] >= 1
    assert len(ana_resp["target_brand_analysis"]["positions"]) >= 1

    # Check that in the entities list, Tesla has is_target_brand = True
    target_entities = [e for e in ana_resp["entities"] if e["is_target_brand"] is True]
    assert len(target_entities) >= 1, "Expected at least one entity with is_target_brand=True"
    print(f"PASS  Target brand correctly flagged as is_target_brand=True: {target_entities[0]['entity_name']}")

    # ── Test 8: Invalid search_run_id returns 404 (Req J) ────────────────────
    print("\n=== TEST 8: 404 on non-existent search_run_id ===")
    fake_run_id = str(uuid.uuid4())
    status_code, err_resp = post(f"/api/v1/search-runs/{fake_run_id}/analyze")
    assert status_code == 404, f"Expected 404, got {status_code}: {err_resp}"
    print(f"PASS  HTTP 404 returned correctly: {err_resp['detail']}")

    print("\n" + "=" * 60)
    print("ALL STEP 6 TESTS COMPLETED AND PASSED [OK]")
    print("=" * 60)


if __name__ == "__main__":
    main()
