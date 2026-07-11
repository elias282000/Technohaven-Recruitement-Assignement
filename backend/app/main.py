import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.requests import router as request_router
from app.api.websocket import router as websocket_router
from app.core.config import get_settings
from app.core.startup_recovery import recover_active_requests
from app.core.task_manager import task_manager
from app.core.websocket_manager import websocket_manager
from app.db.database import close_database

logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s | %(levelname)s | "
        "%(name)s | %(message)s"
    ),
)

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    recovered_count = await recover_active_requests()

    logger.info(
        "Application startup recovered %s request task(s).",
        recovered_count,
    )

    yield

    await websocket_manager.close_all()
    await task_manager.cancel_all()
    await close_database()


app = FastAPI(
    title=settings.app_name,
    version="0.6.0",
    description=(
        "Backend API for the real-time service request "
        "management system."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(request_router)
app.include_router(websocket_router)


@app.get("/", tags=["System"])
async def root() -> dict[str, str]:
    return {
        "message": settings.app_name,
        "environment": settings.app_environment,
    }


@app.get("/health", tags=["System"])
async def health_check() -> dict[str, str]:
    return {"status": "healthy"}