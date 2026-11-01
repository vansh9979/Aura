"""Integration tests for Step 3 Core Project API (Companies, Brands, Projects)."""
import uuid
import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Verify existing health check endpoint remains intact."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_complete_company_brand_project_flow():
    """Test full sequential workflow: Create & Retrieve Company -> Brand -> Project."""
    # 1. Create Company
    company_payload = {
        "name": "Acme Global Industries",
        "website": "https://acmeglobal.com",
    }
    res_company = client.post("/api/v1/companies", json=company_payload)
    assert res_company.status_code == 201
    company_data = res_company.json()
    assert "id" in company_data
    assert company_data["name"] == company_payload["name"]
    company_id = company_data["id"]

    # 2. Retrieve Company
    res_get_company = client.get(f"/api/v1/companies/{company_id}")
    assert res_get_company.status_code == 200
    assert res_get_company.json()["id"] == company_id

    # 3. Create Brand
    brand_payload = {
        "company_id": company_id,
        "name": "Acme Sentinel",
        "website": "https://sentinel.acmeglobal.com",
        "description": "Enterprise AI monitoring and defense platform",
        "industry": "Cybersecurity",
    }
    res_brand = client.post("/api/v1/brands", json=brand_payload)
    assert res_brand.status_code == 201
    brand_data = res_brand.json()
    assert "id" in brand_data
    assert brand_data["company_id"] == company_id
    brand_id = brand_data["id"]

    # 4. Retrieve Brand
    res_get_brand = client.get(f"/api/v1/brands/{brand_id}")
    assert res_get_brand.status_code == 200
    assert res_get_brand.json()["id"] == brand_id

    # 5. Create Project
    project_payload = {
        "company_id": company_id,
        "brand_id": brand_id,
        "name": "Sentinel AI Search Visibility Q4",
        "description": "Tracking search engine perception across LLMs",
        "status": "active",
    }
    res_project = client.post("/api/v1/projects", json=project_payload)
    assert res_project.status_code == 201
    project_data = res_project.json()
    assert "id" in project_data
    assert project_data["company_id"] == company_id
    assert project_data["brand_id"] == brand_id
    project_id = project_data["id"]

    # 6. Retrieve Project
    res_get_project = client.get(f"/api/v1/projects/{project_id}")
    assert res_get_project.status_code == 200
    assert res_get_project.json()["id"] == project_id


def test_foreign_key_validations_and_errors():
    """Verify 404/422 responses for missing parent records and invalid IDs."""
    fake_id = str(uuid.uuid4())

    # Brand with non-existent company_id -> 404
    res_missing_company = client.post(
        "/api/v1/brands",
        json={"company_id": fake_id, "name": "Orphan Brand"},
    )
    assert res_missing_company.status_code == 404

    # Project with non-existent company_id -> 404
    res_missing_project_company = client.post(
        "/api/v1/projects",
        json={
            "company_id": fake_id,
            "brand_id": fake_id,
            "name": "Orphan Project",
        },
    )
    assert res_missing_project_company.status_code == 404

    # GET non-existent record -> 404
    res_not_found = client.get(f"/api/v1/companies/{fake_id}")
    assert res_not_found.status_code == 404

    # Invalid UUID format -> 422
    res_invalid_format = client.get("/api/v1/companies/invalid-uuid-1234")
    assert res_invalid_format.status_code == 422
