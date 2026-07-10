import asyncio
import logging

from sqlalchemy import select

from app.core.config import get_settings
from app.db.database import AsyncSessionFactory
from app.db.models import (
    RequestStatus,
    ServiceRequest,
)
from app.services.request_service import (
    RequestConflictError,
    RequestNotFoundError,
    transition_request,
)

logger = logging.getLogger(__name__)
settings = get_settings()

TERMINAL_STATUSES = {
    RequestStatus.COMPLETED,
    RequestStatus.CANCELLED,
}


async def load_request_status(
    request_id: int,
) -> RequestStatus | None:
    """Load the latest persisted status using a new database session."""

    async with AsyncSessionFactory() as session:
        statement = select(ServiceRequest.status).where(
            ServiceRequest.id == request_id
        )

        result = await session.execute(statement)

        return result.scalar_one_or_none()


async def attempt_automatic_transition(
    request_id: int,
    requested_status: RequestStatus,
) -> bool:
    """
    Attempt one automatic transition through the shared service.

    A conflict means a manual action or another task changed the
    request first, so the automatic worker should re-evaluate state.
    """

    async with AsyncSessionFactory() as session:
        try:
            await transition_request(
                session=session,
                request_id=request_id,
                requested_status=requested_status,
                current_user=None,
                enforce_authorization=False,
            )
        except (
            RequestNotFoundError,
            RequestConflictError,
        ):
            return False

    return True


async def process_request(request_id: int) -> None:
    """
    Progress one request independently using persisted state.

    The status is reloaded before every transition so cancellation,
    manual progression, and automatic progression cannot overwrite
    a newer terminal state.
    """

    try:
        while True:
            current_status = await load_request_status(
                request_id
            )

            if current_status is None:
                return

            if current_status in TERMINAL_STATUSES:
                return

            if current_status == RequestStatus.PENDING:
                await asyncio.sleep(
                    settings.pending_processing_delay_seconds
                )

                latest_status = await load_request_status(
                    request_id
                )

                if latest_status is None:
                    return

                if latest_status in TERMINAL_STATUSES:
                    return

                if latest_status == RequestStatus.PENDING:
                    await attempt_automatic_transition(
                        request_id=request_id,
                        requested_status=(
                            RequestStatus.IN_PROGRESS
                        ),
                    )

                # Reload from PostgreSQL on the next iteration.
                # This also handles a manual pending → in_progress
                # transition that occurred while the worker slept.
                continue

            if current_status == RequestStatus.IN_PROGRESS:
                await asyncio.sleep(
                    settings.completion_processing_delay_seconds
                )

                latest_status = await load_request_status(
                    request_id
                )

                if latest_status is None:
                    return

                if latest_status in TERMINAL_STATUSES:
                    return

                if latest_status == RequestStatus.IN_PROGRESS:
                    await attempt_automatic_transition(
                        request_id=request_id,
                        requested_status=RequestStatus.COMPLETED,
                    )

                return

            logger.warning(
                "Request %s has unexpected status %s.",
                request_id,
                current_status,
            )
            return

    except asyncio.CancelledError:
        # Shutdown cancellation is expected. Persisted status remains
        # available for startup recovery on the next application run.
        raise
    except Exception:
        logger.exception(
            "Unexpected processing failure for request %s.",
            request_id,
        )