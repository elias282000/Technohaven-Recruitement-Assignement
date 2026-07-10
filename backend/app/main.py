from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Reserve application startup and shutdown hooks for later phases."""
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Backend API for the real-time service request management system.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["System"])
async def root() -> dict[str, str]:
    return {
        "message": settings.app_name,
        "environment": settings.app_environment,
    }


@app.get("/health", tags=["System"])
async def health_check() -> dict[str, str]:
    return {"status": "healthy"}
