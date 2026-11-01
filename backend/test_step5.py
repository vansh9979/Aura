"""
Step 5 Live Test Script
Runs all verification tests against the running FastAPI server and the real Gemini API.
"""
import json
import sys
import urllib.request
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from app.core.database import SessionLocal
from app.models.prompt import Prompt
from app.models.search_run import SearchRun
from app.models.ai_response import AIResponse

BASE = "http://localhost:8000"

def get(path):
    r = urllib.request.urlopen(f"{BASE}{path}", timeout=10)
    return json.loads(r.read())

def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{BASE}{path}", data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        r = urllib.request.urlopen(req, timeout=60)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def main():
    # ── Test 1: Health check ──────────────────────────────────────────────────────
    print("\n=== TEST 1: Health Check ===")
    h = get("/api/v1/health")
    assert h["status"] == "ok", f"Health failed: {h}"
    print(f"PASS  status={h['status']}")

    # ── Find an existing prompt ───────────────────────────────────────────────────
    print("\n=== Setup: Fetching an existing prompt from the DB ===")
    db = SessionLocal()
    prompt = db.query(Prompt).filter(Prompt.is_active == True).first()
    if not prompt:
        print("ERROR: No active prompts found in DB. Create a prompt first.")
        db.close()
        sys.exit(1)
    prompt_id = str(prompt.id)
    prompt_text_preview = prompt.prompt_text[:80]
    print(f"Found prompt_id : {prompt_id}")
    print(f"Prompt text     : {prompt_text_preview!r}")
    db.close()

    # ── Test 2: POST /api/v1/search-runs (real Gemini call) ──────────────────────
    print("\n=== TEST 2: POST /api/v1/search-runs (real Gemini call) ===")
    status_code, resp = post("/api/v1/search-runs", {"prompt_id": prompt_id})
    print(f"HTTP Status  : {status_code}")
    print(f"Response     : {json.dumps(resp, indent=2)}")
    assert status_code == 201, f"Expected 201, got {status_code}: {resp}"
    assert resp["status"] == "completed", f"Run not completed: {resp}"
    assert resp["engine"] == "gemini", f"Wrong engine: {resp}"
    assert resp["model"], "Model field is empty"
    assert resp["response"], "Response text is empty"
    search_run_id = resp["search_run_id"]
    print(f"\nPASS  search_run_id={search_run_id}")
    print(f"      engine={resp['engine']}")
    print(f"      model={resp['model']}")
    print(f"      response preview: {resp['response'][:120]!r}")

    # ── Test 3: Verify search_runs DB record ──────────────────────────────────────
    print("\n=== TEST 3: Verify search_runs DB record ===")
    db = SessionLocal()
    import uuid
    run = db.get(SearchRun, uuid.UUID(search_run_id))
    assert run is not None, "SearchRun not found in DB"
    assert str(run.prompt_id) == prompt_id
    assert run.engine == "gemini"
    assert run.status == "completed"
    assert run.model is not None
    assert run.started_at is not None
    assert run.completed_at is not None
    assert run.error_message is None
    print(f"PASS  DB record found")
    print(f"      prompt_id={run.prompt_id}")
    print(f"      engine={run.engine}")
    print(f"      model={run.model}")
    print(f"      status={run.status}")
    print(f"      started_at={run.started_at}")
    print(f"      completed_at={run.completed_at}")

    # ── Test 4: Verify ai_responses DB record ─────────────────────────────────────
    print("\n=== TEST 4: Verify ai_responses DB record ===")
    ai_resp = db.query(AIResponse).filter(AIResponse.search_run_id == run.id).first()
    assert ai_resp is not None, "AIResponse not found in DB"
    assert ai_resp.response_text, "response_text is empty"
    assert ai_resp.response_metadata, "response_metadata is empty"
    print(f"PASS  ai_response found")
    print(f"      search_run_id={ai_resp.search_run_id}")
    print(f"      response_text preview: {ai_resp.response_text[:120]!r}")
    print(f"      response_metadata: {json.dumps(ai_resp.response_metadata, indent=6)}")

    # ── Test 5: Verify the relationship ──────────────────────────────────────────
    print("\n=== TEST 5: Verify relationship search_runs.id -> ai_responses.search_run_id ===")
    assert str(ai_resp.search_run_id) == search_run_id, "FK mismatch!"
    print(f"PASS  search_runs.id == ai_responses.search_run_id = {search_run_id}")
    db.close()

    # ── Test 6: 404 for invalid prompt_id ────────────────────────────────────────
    print("\n=== TEST 6: Invalid prompt_id returns 404 ===")
    fake_id = "00000000-0000-0000-0000-000000000000"
    status_code, resp = post("/api/v1/search-runs", {"prompt_id": fake_id})
    assert status_code == 404, f"Expected 404, got {status_code}: {resp}"
    print(f"PASS  HTTP {status_code}: {resp['detail']}")

    print("\n" + "="*60)
    print("ALL TESTS PASSED [OK]")
    print("="*60)


if __name__ == "__main__":
    main()
