from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "Real-Time Service Request Management System"
    app_environment: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = Field(default=8000, ge=1, le=65535)
    frontend_origin: str = "http://localhost:5173"

    database_url: str = Field(
        min_length=1,
        description="Async SQLAlchemy PostgreSQL connection URL.",
    )

    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: Literal["HS256"] = "HS256"

    access_token_expire_minutes: int = Field(
        default=1440,
        gt=0,
    )

    pending_processing_delay_seconds: int = Field(
        default=5,
        ge=0,
    )

    completion_processing_delay_seconds: int = Field(
        default=10,
        ge=0,
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()