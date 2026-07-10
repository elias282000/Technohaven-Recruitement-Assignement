from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "Real-Time Service Request Management System"
    app_environment: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    frontend_origin: str = "http://localhost:5173"

    # Used in later implementation steps. Kept here now so configuration has
    # one stable home from the beginning of the project.
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/service_request_db"
    jwt_secret_key: str = "replace-this-development-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    pending_processing_delay_seconds: int = 5
    completion_processing_delay_seconds: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
