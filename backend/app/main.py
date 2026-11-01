"""Main FastAPI application entry point for AI Search Intelligence Platform."""
import os
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.health import router as health_router
from app.api.v1.companies import router as companies_router
from app.api.v1.brands import router as brands_router
from app.api.v1.projects import router as projects_router
from app.api.v1.prompts import router as prompts_router
from app.api.v1.search_runs import router as search_runs_router

app = FastAPI(
    title="AI Search Intelligence Platform API",
    description="Backend API services for AI Search Intelligence Platform",
    version="0.1.0",
)

# Configure CORS to allow the frontend to communicate with the backend
allowed_origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
)
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routes
app.include_router(health_router, prefix="/api/v1")
app.include_router(companies_router, prefix="/api/v1")
app.include_router(brands_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(prompts_router, prefix="/api/v1")
app.include_router(search_runs_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
def root():
    """Root welcoming endpoint."""
    return {
        "title": "AI Search Intelligence Platform API",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
