from typing import Annotated

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    status,
)

from app.api.dependencies import (
    CurrentUser,
    DatabaseSession,
)
from app.db.models import (
    RequestPriority,
    RequestStatus,
    ServiceRequest,
)
from app.schemas.requests import (
    RequestCreate,
    RequestResponse,
    RequestStatusHistoryResponse,
    RequestStatusUpdate,
)
from app.services.request_service import (
    RequestConflictError,
    RequestNotFoundError,
    RequestPermissionError,
    cancel_request,
    create_request,
    get_request_by_id,
    get_request_history,
    list_requests,
    manually_update_request_status,
)

router = APIRouter(
    prefix="/requests",
    tags=["Service Requests"],
)

SearchQuery = Annotated[
    str | None,
    Query(
        min_length=1,
        max_length=200,
        description=(
            "Case-insensitive search across title, "
            "description, and requester name."
        ),
    ),
]


def map_request_service_error(
    error: Exception,
) -> HTTPException:
    """Convert business exceptions to HTTP responses."""

    if isinstance(error, RequestNotFoundError):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )

    if isinstance(error, RequestPermissionError):
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(error),
        )

    if isinstance(error, RequestConflictError):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An unexpected request-processing error occurred.",
    )


@router.post(
    "",
    response_model=RequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a service request",
)
async def create_service_request(
    payload: RequestCreate,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> ServiceRequest:
    return await create_request(
        session=session,
        payload=payload,
        current_user=current_user,
    )


@router.get(
    "",
    response_model=list[RequestResponse],
    summary="List, search, and filter service requests",
)
async def get_service_requests(
    session: DatabaseSession,
    current_user: CurrentUser,
    request_status: Annotated[
        RequestStatus | None,
        Query(
            alias="status",
            description="Filter by request status.",
        ),
    ] = None,
    priority: Annotated[
        RequestPriority | None,
        Query(
            description="Filter by request priority.",
        ),
    ] = None,
    q: SearchQuery = None,
) -> list[ServiceRequest]:
    del current_user

    requests = await list_requests(
        session=session,
        status=request_status,
        priority=priority,
        query=q,
    )

    return list(requests)


@router.get(
    "/{request_id}",
    response_model=RequestResponse,
    summary="Get service request details",
)
async def get_service_request(
    request_id: int,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> ServiceRequest:
    del current_user

    try:
        return await get_request_by_id(
            session=session,
            request_id=request_id,
        )
    except (
        RequestNotFoundError,
        RequestPermissionError,
        RequestConflictError,
    ) as error:
        raise map_request_service_error(error) from error


@router.get(
    "/{request_id}/history",
    response_model=list[RequestStatusHistoryResponse],
    summary="Get service request status history",
)
async def get_service_request_history(
    request_id: int,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> list[RequestStatusHistoryResponse]:
    del current_user

    try:
        history = await get_request_history(
            session=session,
            request_id=request_id,
        )

        return list(history)
    except (
        RequestNotFoundError,
        RequestPermissionError,
        RequestConflictError,
    ) as error:
        raise map_request_service_error(error) from error


@router.patch(
    "/{request_id}/status",
    response_model=RequestResponse,
    summary="Manually update a request status",
)
async def update_service_request_status(
    request_id: int,
    payload: RequestStatusUpdate,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> ServiceRequest:
    try:
        return await manually_update_request_status(
            session=session,
            request_id=request_id,
            requested_status=payload.status,
            current_user=current_user,
        )
    except (
        RequestNotFoundError,
        RequestPermissionError,
        RequestConflictError,
    ) as error:
        raise map_request_service_error(error) from error


@router.delete(
    "/{request_id}",
    response_model=RequestResponse,
    status_code=status.HTTP_200_OK,
    summary="Cancel a service request",
)
async def cancel_service_request(
    request_id: int,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> ServiceRequest:
    try:
        return await cancel_request(
            session=session,
            request_id=request_id,
            current_user=current_user,
        )
    except (
        RequestNotFoundError,
        RequestPermissionError,
        RequestConflictError,
    ) as error:
        raise map_request_service_error(error) from error