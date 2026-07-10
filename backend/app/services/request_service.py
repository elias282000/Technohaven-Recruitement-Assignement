from collections.abc import Sequence

from sqlalchemy import (
    Select,
    func,
    or_,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    RequestPriority,
    RequestStatus,
    RequestStatusHistory,
    ServiceRequest,
    User,
    UserRole,
)
from app.schemas.requests import RequestCreate

from app.core.task_manager import task_manager


VALID_STATUS_TRANSITIONS: dict[
    RequestStatus,
    set[RequestStatus],
] = {
    RequestStatus.PENDING: {
        RequestStatus.IN_PROGRESS,
        RequestStatus.CANCELLED,
    },
    RequestStatus.IN_PROGRESS: {
        RequestStatus.COMPLETED,
        RequestStatus.CANCELLED,
    },
    RequestStatus.COMPLETED: set(),
    RequestStatus.CANCELLED: set(),
}


class RequestServiceError(Exception):
    """Base exception for request business-rule failures."""


class RequestNotFoundError(RequestServiceError):
    """Raised when a service request does not exist."""


class RequestPermissionError(RequestServiceError):
    """Raised when a user cannot modify a request."""


class RequestConflictError(RequestServiceError):
    """Raised when a request transition cannot be completed."""


def validate_status_transition(
    current_status: RequestStatus,
    requested_status: RequestStatus,
) -> None:
    """Validate one request lifecycle transition."""

    if current_status == requested_status:
        raise RequestConflictError(
            "A request cannot transition to its current status."
        )

    if current_status in {
        RequestStatus.COMPLETED,
        RequestStatus.CANCELLED,
    }:
        raise RequestConflictError(
            "Completed and cancelled requests cannot be changed."
        )

    allowed_statuses = VALID_STATUS_TRANSITIONS[
        current_status
    ]

    if requested_status not in allowed_statuses:
        raise RequestConflictError(
            (
                f"Transition from '{current_status.value}' "
                f"to '{requested_status.value}' is not allowed."
            )
        )


def ensure_user_can_modify_request(
    request: ServiceRequest,
    current_user: User,
) -> None:
    """Enforce Supervisor-wide and Operator ownership access."""

    if current_user.role == UserRole.SUPERVISOR:
        return

    if request.created_by != current_user.id:
        raise RequestPermissionError(
            "Operators may modify only requests they created."
        )


def build_request_list_statement(
    status: RequestStatus | None,
    priority: RequestPriority | None,
    query: str | None,
) -> Select[tuple[ServiceRequest]]:
    """Build the combined request list/search/filter query."""

    statement = (
        select(ServiceRequest)
        .options(
            selectinload(ServiceRequest.creator)
        )
        .order_by(
            ServiceRequest.created_at.desc(),
            ServiceRequest.id.desc(),
        )
    )

    if status is not None:
        statement = statement.where(
            ServiceRequest.status == status
        )

    if priority is not None:
        statement = statement.where(
            ServiceRequest.priority == priority
        )

    if query is not None:
        normalized_query = query.strip()

        if normalized_query:
            search_pattern = (
                f"%{normalized_query}%"
            )

            statement = statement.where(
                or_(
                    ServiceRequest.title.ilike(
                        search_pattern
                    ),
                    ServiceRequest.description.ilike(
                        search_pattern
                    ),
                    ServiceRequest.requester_name.ilike(
                        search_pattern
                    ),
                )
            )

    return statement


async def create_request(
    session: AsyncSession,
    payload: RequestCreate,
    current_user: User,
) -> ServiceRequest:
    """Create a pending request and schedule its processing task."""

    service_request = ServiceRequest(
        title=payload.title,
        description=payload.description,
        requester_name=payload.requester_name,
        priority=payload.priority,
        status=RequestStatus.PENDING,
        created_by=current_user.id,
    )

    session.add(service_request)

    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    statement = (
        select(ServiceRequest)
        .options(
            selectinload(ServiceRequest.creator)
        )
        .where(
            ServiceRequest.id == service_request.id
        )
    )

    result = await session.execute(statement)
    persisted_request = result.scalar_one()

    task_manager.schedule(persisted_request.id)

    return persisted_request


async def list_requests(
    session: AsyncSession,
    status: RequestStatus | None = None,
    priority: RequestPriority | None = None,
    query: str | None = None,
) -> Sequence[ServiceRequest]:
    """Return requests matching combined search and filters."""

    statement = build_request_list_statement(
        status=status,
        priority=priority,
        query=query,
    )

    result = await session.execute(statement)

    return result.scalars().all()


async def get_request_by_id(
    session: AsyncSession,
    request_id: int,
) -> ServiceRequest:
    """Return one request with its creator loaded."""

    statement = (
        select(ServiceRequest)
        .options(
            selectinload(ServiceRequest.creator)
        )
        .where(
            ServiceRequest.id == request_id
        )
    )

    result = await session.execute(statement)
    service_request = result.scalar_one_or_none()

    if service_request is None:
        raise RequestNotFoundError(
            "Service request not found."
        )

    return service_request


async def get_request_history(
    session: AsyncSession,
    request_id: int,
) -> Sequence[RequestStatusHistory]:
    """Return chronological status history for a request."""

    exists_statement = (
        select(ServiceRequest.id)
        .where(ServiceRequest.id == request_id)
    )

    exists_result = await session.execute(
        exists_statement
    )

    if exists_result.scalar_one_or_none() is None:
        raise RequestNotFoundError(
            "Service request not found."
        )

    statement = (
        select(RequestStatusHistory)
        .where(
            RequestStatusHistory.request_id
            == request_id
        )
        .order_by(
            RequestStatusHistory.changed_at.asc(),
            RequestStatusHistory.id.asc(),
        )
    )

    result = await session.execute(statement)

    return result.scalars().all()


async def transition_request(
    session: AsyncSession,
    request_id: int,
    requested_status: RequestStatus,
    current_user: User | None,
    enforce_authorization: bool = True,
) -> ServiceRequest:
    """
    Apply one validated transition and history insertion atomically.

    The row lock ensures that concurrent transition attempts are
    validated against the latest committed request state.
    """

    try:
        statement = (
            select(ServiceRequest)
            .where(
                ServiceRequest.id == request_id
            )
            .with_for_update()
        )

        result = await session.execute(statement)
        service_request = result.scalar_one_or_none()

        if service_request is None:
            raise RequestNotFoundError(
                "Service request not found."
            )

        if enforce_authorization:
            if current_user is None:
                raise RequestPermissionError(
                    "An authenticated user is required."
                )

            ensure_user_can_modify_request(
                request=service_request,
                current_user=current_user,
            )

        old_status = service_request.status

        validate_status_transition(
            current_status=old_status,
            requested_status=requested_status,
        )

        service_request.status = requested_status
        service_request.updated_at = func.now()

        history_entry = RequestStatusHistory(
            request_id=service_request.id,
            old_status=old_status,
            new_status=requested_status,
        )

        session.add(history_entry)

        await session.commit()

    except RequestServiceError:
        await session.rollback()
        raise
    except Exception:
        await session.rollback()
        raise

    refreshed_statement = (
        select(ServiceRequest)
        .options(
            selectinload(ServiceRequest.creator)
        )
        .where(
            ServiceRequest.id == request_id
        )
    )

    refreshed_result = await session.execute(
        refreshed_statement
    )

    return refreshed_result.scalar_one()


async def manually_update_request_status(
    session: AsyncSession,
    request_id: int,
    requested_status: RequestStatus,
    current_user: User,
) -> ServiceRequest:
    """Apply an authorized manual progression transition."""

    if requested_status == RequestStatus.CANCELLED:
        raise RequestConflictError(
            (
                "Use the cancellation endpoint to cancel "
                "a service request."
            )
        )

    return await transition_request(
        session=session,
        request_id=request_id,
        requested_status=requested_status,
        current_user=current_user,
        enforce_authorization=True,
    )


async def cancel_request(
    session: AsyncSession,
    request_id: int,
    current_user: User,
) -> ServiceRequest:
    """Soft-cancel an authorized non-terminal request."""

    return await transition_request(
        session=session,
        request_id=request_id,
        requested_status=RequestStatus.CANCELLED,
        current_user=current_user,
        enforce_authorization=True,
    )