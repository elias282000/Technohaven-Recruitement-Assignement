import pytest

from app.db.models import (
    RequestStatus,
    ServiceRequest,
    User,
    UserRole,
)
from app.services.request_service import (
    RequestConflictError,
    RequestPermissionError,
    ensure_user_can_modify_request,
    validate_status_transition,
)


@pytest.mark.parametrize(
    ("current_status", "requested_status"),
    [
        (
            RequestStatus.PENDING,
            RequestStatus.IN_PROGRESS,
        ),
        (
            RequestStatus.PENDING,
            RequestStatus.CANCELLED,
        ),
        (
            RequestStatus.IN_PROGRESS,
            RequestStatus.COMPLETED,
        ),
        (
            RequestStatus.IN_PROGRESS,
            RequestStatus.CANCELLED,
        ),
    ],
)
def test_valid_status_transitions(
    current_status: RequestStatus,
    requested_status: RequestStatus,
) -> None:
    validate_status_transition(
        current_status=current_status,
        requested_status=requested_status,
    )


@pytest.mark.parametrize(
    ("current_status", "requested_status"),
    [
        (
            RequestStatus.PENDING,
            RequestStatus.COMPLETED,
        ),
        (
            RequestStatus.IN_PROGRESS,
            RequestStatus.PENDING,
        ),
        (
            RequestStatus.COMPLETED,
            RequestStatus.PENDING,
        ),
        (
            RequestStatus.CANCELLED,
            RequestStatus.IN_PROGRESS,
        ),
        (
            RequestStatus.PENDING,
            RequestStatus.PENDING,
        ),
    ],
)
def test_invalid_status_transitions(
    current_status: RequestStatus,
    requested_status: RequestStatus,
) -> None:
    with pytest.raises(RequestConflictError):
        validate_status_transition(
            current_status=current_status,
            requested_status=requested_status,
        )


def build_user(
    user_id: int,
    role: UserRole,
) -> User:
    return User(
        id=user_id,
        email=f"user{user_id}@example.com",
        hashed_password="$2b$placeholder",
        role=role,
    )


def build_request(created_by: int) -> ServiceRequest:
    return ServiceRequest(
        id=10,
        title="Printer not working",
        description="The office printer is jammed.",
        requester_name="Ayesha Rahman",
        created_by=created_by,
    )


def test_operator_can_modify_owned_request() -> None:
    operator = build_user(
        user_id=1,
        role=UserRole.OPERATOR,
    )

    service_request = build_request(
        created_by=operator.id,
    )

    ensure_user_can_modify_request(
        request=service_request,
        current_user=operator,
    )


def test_operator_cannot_modify_another_users_request() -> None:
    operator = build_user(
        user_id=1,
        role=UserRole.OPERATOR,
    )

    service_request = build_request(
        created_by=2,
    )

    with pytest.raises(RequestPermissionError):
        ensure_user_can_modify_request(
            request=service_request,
            current_user=operator,
        )


def test_supervisor_can_modify_any_request() -> None:
    supervisor = build_user(
        user_id=99,
        role=UserRole.SUPERVISOR,
    )

    service_request = build_request(
        created_by=2,
    )

    ensure_user_can_modify_request(
        request=service_request,
        current_user=supervisor,
    )