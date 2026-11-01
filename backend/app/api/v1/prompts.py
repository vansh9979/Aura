"""Prompt API endpoints for managing AI search prompts."""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.project import Project
from app.models.prompt import Prompt
from app.schemas.prompt import PromptCreate, PromptRead, PromptUpdate

router = APIRouter(tags=["Prompts"])


@router.post(
    "/prompts",
    response_model=PromptRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create Prompt",
    description="Create a new prompt/query linked to an existing project.",
)
def create_prompt(
    payload: PromptCreate,
    db: Session = Depends(get_db),
) -> PromptRead:
    """Create a new prompt after verifying the parent project exists."""
    # Verify project exists
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id '{payload.project_id}' not found",
        )

    prompt = Prompt(
        project_id=payload.project_id,
        prompt_text=payload.prompt_text,
        category=payload.category,
        language=payload.language,
        region=payload.region,
        is_active=payload.is_active,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.get(
    "/prompts/{prompt_id}",
    response_model=PromptRead,
    status_code=status.HTTP_200_OK,
    summary="Get Prompt",
    description="Retrieve a single prompt by its unique UUID.",
)
def get_prompt(
    prompt_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> PromptRead:
    """Retrieve a prompt by its ID."""
    prompt = db.get(Prompt, prompt_id)
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prompt with id '{prompt_id}' not found",
        )
    return prompt


@router.get(
    "/projects/{project_id}/prompts",
    response_model=List[PromptRead],
    status_code=status.HTTP_200_OK,
    summary="List Project Prompts",
    description="Retrieve all prompts belonging to a specific project.",
)
def list_project_prompts(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> List[PromptRead]:
    """List all prompts for the given project."""
    # Verify project exists
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id '{project_id}' not found",
        )

    prompts = (
        db.query(Prompt)
        .filter(Prompt.project_id == project_id)
        .order_by(Prompt.created_at)
        .all()
    )
    return prompts


@router.patch(
    "/prompts/{prompt_id}",
    response_model=PromptRead,
    status_code=status.HTTP_200_OK,
    summary="Update Prompt",
    description="Partially update a prompt's text, category, language, region, or active status.",
)
def update_prompt(
    prompt_id: uuid.UUID,
    payload: PromptUpdate,
    db: Session = Depends(get_db),
) -> PromptRead:
    """Partially update a prompt — only provided fields are changed."""
    prompt = db.get(Prompt, prompt_id)
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prompt with id '{prompt_id}' not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prompt, field, value)

    db.commit()
    db.refresh(prompt)
    return prompt


@router.delete(
    "/prompts/{prompt_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Prompt",
    description="Permanently delete a prompt by its unique UUID.",
)
def delete_prompt(
    prompt_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> None:
    """Delete a prompt by its ID."""
    prompt = db.get(Prompt, prompt_id)
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prompt with id '{prompt_id}' not found",
        )

    db.delete(prompt)
    db.commit()
