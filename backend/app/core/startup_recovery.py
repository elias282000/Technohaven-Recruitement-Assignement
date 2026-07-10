import logging

from sqlalchemy import select

from app.core.task_manager import task_manager
from app.db.database import AsyncSessionFactory
from app.db.models import (
    RequestStatus,
    ServiceRequest,
)

logger = logging.getLogger(__name__)

RECOVERABLE_STATUSES = {
    RequestStatus.PENDING,
    RequestStatus.IN_PROGRESS,
}


async def recover_active_requests() -> int:
    """
    Reschedule persisted pending and in-progress requests.

    Returns the number of new local tasks scheduled during recovery.
    """

    async with AsyncSessionFactory() as session:
        statement = (
            select(ServiceRequest.id)
            .where(
                ServiceRequest.status.in_(
                    RECOVERABLE_STATUSES
                )
            )
            .order_by(ServiceRequest.id.asc())
        )

        result = await session.execute(statement)
        request_ids = result.scalars().all()

    scheduled_count = 0

    for request_id in request_ids:
        if task_manager.schedule(request_id):
            scheduled_count += 1

    logger.info(
        "Startup recovery found %s active request(s) and "
        "scheduled %s task(s).",
        len(request_ids),
        scheduled_count,
    )

    return scheduled_count