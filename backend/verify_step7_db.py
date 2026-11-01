"""Direct DB verification of citation and source extraction (deduplication + idempotency)."""
import sys, uuid
sys.path.insert(0, '.')
from app.core.database import SessionLocal
from app.models.ai_response import AIResponse
from app.models.citation import Citation
from app.models.source import Source
from app.services.ai.citation_service import extract_and_persist_citations

GROUNDING_DATA = {
    'web_search_queries': ['best CRM software 2025', 'top CRM platforms 2025'],
    'search_entry_point': '<html>test</html>',
    'grounding_chunks': [
        {'index': 0, 'uri': 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/avoma-test1', 'title': 'avoma.com', 'domain': None},
        {'index': 1, 'uri': 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/resonatehq-test2', 'title': 'resonatehq.com', 'domain': None},
        {'index': 2, 'uri': 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/zapier-test3', 'title': 'zapier.com', 'domain': None},
    ],
    'grounding_supports': [
        {
            'grounding_chunk_indices': [0, 1],
            'confidence_scores': [0.9, 0.8],
            'segment': {
                'start_index': 0,
                'end_index': 100,
                'text': 'In 2025, CRM platforms include Salesforce and HubSpot as market leaders.'
            }
        },
        {
            'grounding_chunk_indices': [2],
            'confidence_scores': [0.75],
            'segment': {
                'start_index': 200,
                'end_index': 300,
                'text': 'HubSpot is known for its intuitive interface and fast onboarding.'
            }
        }
    ]
}

db = SessionLocal()
try:
    ai_resp = db.query(AIResponse).order_by(AIResponse.created_at.desc()).first()
    print(f'Using ai_response_id: {ai_resp.id}')

    result = extract_and_persist_citations(db, ai_resp, GROUNDING_DATA)
    db.commit()

    print('\nExtraction Result:')
    print(f'  new_sources_created    : {result.new_sources_created}')
    print(f'  existing_sources_reused: {result.existing_sources_reused}')
    print(f'  sources_count          : {result.sources_count}')
    print(f'  citations_count        : {result.citations_count}')

    print('\nSources stored in DB:')
    for s in result.sources:
        db.refresh(s)
        print(f'  [{s.id}]')
        print(f'    domain : {s.domain}')
        print(f'    title  : {s.title}')
        print(f'    url    : {s.url[:60]}...')

    print('\nCitations stored in DB:')
    for c in result.citations:
        db.refresh(c)
        preview = (c.cited_text or '')[:70]
        print(f'  type={c.citation_type}, pos={c.citation_position}, source={c.source_id}')
        print(f'    cited_text: {preview!r}')

    # --- Deduplication test ---
    print('\n--- Deduplication test: run extract again ---')
    result2 = extract_and_persist_citations(db, ai_resp, GROUNDING_DATA)
    db.commit()
    print(f'  new_sources_created    : {result2.new_sources_created}  (SHOULD BE 0)')
    print(f'  existing_sources_reused: {result2.existing_sources_reused} (SHOULD BE {result.sources_count})')
    assert result2.new_sources_created == 0, 'FAIL: Deduplication failed!'
    print('  PASS: Deduplication confirmed, no duplicate sources created')

    # --- Idempotency test ---
    total_citations = db.query(Citation).filter(Citation.ai_response_id == ai_resp.id).count()
    print('\n--- Idempotency test: citation count ---')
    print(f'  Total citations in DB: {total_citations}')
    print(f'  Extracted this run   : {result2.citations_count}')
    assert total_citations == result2.citations_count, 'FAIL: Idempotency broken!'
    print('  PASS: Citations are idempotent')

    print('\n=== DB VERIFICATION COMPLETE — ALL PASSED ===')

finally:
    db.close()
