"""Application configuration module using Pydantic Settings."""
import os
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global application settings loaded from environment variables or .env."""

    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Database Settings (SQLAlchemy 2.0 + Psycopg 3)
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/ai_search_intelligence",
        description="PostgreSQL connection string with psycopg 3 driver",
    )

    # Gemini AI Settings
    GEMINI_API_KEY: Optional[str] = Field(
        default=None,
        description="Google Gemini API key — required for search run execution",
    )
    GEMINI_MODEL: str = Field(
        default="gemini-robotics-er-2-preview",
        description="Gemini model identifier used for all AI search runs",
    )
    GEMINI_SEARCH_GROUNDING_ENABLED: bool = Field(
        default=True,
        description="Whether Google Search grounding is enabled for search runs",
    )

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> List[str]:
        """Parsed list of allowed CORS origins."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
