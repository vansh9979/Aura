"""Health check router for verifying backend availability."""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health Check Endpoint")
def health_check():
    """Return a simple JSON status indicating that the backend is running."""
    return {
        "status": "ok",
        "message": "AI Search Intelligence Platform backend is running successfully.",
        "service": "backend",
        "version": "0.1.0",
    }
