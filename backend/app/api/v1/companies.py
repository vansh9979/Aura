"""Company API endpoints for creating and retrieving companies."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyRead

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.post(
    "",
    response_model=CompanyRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create Company",
    description="Create a new organization/company account.",
)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
) -> CompanyRead:
    """Create a new company."""
    company = Company(
        name=payload.name,
        website=payload.website,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get(
    "",
    response_model=list[CompanyRead],
    status_code=status.HTTP_200_OK,
    summary="List Companies",
    description="Retrieve all companies ordered by name.",
)
def list_companies(
    db: Session = Depends(get_db),
) -> list[CompanyRead]:
    """Retrieve all companies."""
    return db.query(Company).order_by(Company.name.asc()).all()


@router.get(
    "/{company_id}",
    response_model=CompanyRead,
    status_code=status.HTTP_200_OK,
    summary="Get Company",
    description="Retrieve company details by unique UUID.",
)
def get_company(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> CompanyRead:
    """Retrieve a company by its ID."""
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with id '{company_id}' not found",
        )
    return company
