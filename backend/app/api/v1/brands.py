"""Brand API endpoints for creating and retrieving monitored brands."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.company import Company
from app.models.brand import Brand
from app.schemas.brand import BrandCreate, BrandRead

router = APIRouter(prefix="/brands", tags=["Brands"])


@router.post(
    "",
    response_model=BrandRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create Brand",
    description="Create a new brand monitored under a company.",
)
def create_brand(
    payload: BrandCreate,
    db: Session = Depends(get_db),
) -> BrandRead:
    """Create a new brand associated with an existing company."""
    # Verify company exists
    company = db.get(Company, payload.company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with id '{payload.company_id}' not found",
        )

    brand = Brand(
        company_id=payload.company_id,
        name=payload.name,
        website=payload.website,
        description=payload.description,
        industry=payload.industry,
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


@router.get(
    "",
    response_model=list[BrandRead],
    status_code=status.HTTP_200_OK,
    summary="List Brands",
    description="Retrieve all brands, optionally filtered by company_id.",
)
def list_brands(
    company_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
) -> list[BrandRead]:
    """Retrieve brands, optionally filtered by company_id."""
    query = db.query(Brand)
    if company_id is not None:
        query = query.filter(Brand.company_id == company_id)
    return query.order_by(Brand.name.asc()).all()


@router.get(
    "/{brand_id}",
    response_model=BrandRead,
    status_code=status.HTTP_200_OK,
    summary="Get Brand",
    description="Retrieve brand details by unique UUID.",
)
def get_brand(
    brand_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> BrandRead:
    """Retrieve a brand by its ID."""
    brand = db.get(Brand, brand_id)
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand with id '{brand_id}' not found",
        )
    return brand
