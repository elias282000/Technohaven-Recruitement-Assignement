from datetime import datetime, timezone
from typing import AsyncIterator

from fastapi.testclient import TestClient

import app.api.requests as request_router_module
from app.api.dependencies import get_current_user
from app.db.database import get_db_session
from app.db.models import (
    RequestPriority,
    RequestStatus,
    ServiceRequest,
    User,
    UserRole,
)
from app.main import app
from app.services.request_service import (
    RequestConflictError,
    RequestNotFoundError,
    RequestPermissionError,
)

client = TestClient(app)


async def override_db_session() -> AsyncIterator[None]:
    yield None


def build_user(
    user_id: int = 1,
    role: UserRole = UserRole.OPERATOR,
) -> User:
    return User(
        id=user_id,
        email="operator@example.com",
        hashed_password="$2b$placeholder",
        role=role,
        created_at=datetime.now(timezone.utc),
    )


def build_request(
    owner: User,
    status: RequestStatus = RequestStatus.PENDING,
) -> ServiceRequest:
    now = datetime.now(timezone.utc)

    request = ServiceRequest(
        id=42,
        title="Printer not working",
        description=(
            "The third-floor office printer is jammed."
        ),
        requester_name="Ayesha Rahman",
        priority=RequestPriority.MEDIUM,
        status=status,
        created_by=owner.id,
        created_at=now,
        updated_at=now,
    )

    request.creator = owner

    return request


def set_overrides(user: User) -> None:
    app.dependency_overrides[
        get_db_session
    ] = override_db_session

    app.dependency_overrides[
        get_current_user
    ] = lambda: user


def clear_overrides() -> None:
    app.dependency_overrides.clear()


def test_create_request_returns_201(
    monkeypatch,
) -> None:
    user = build_user()
    expected_request = build_request(user)

    async def fake_create_request(
        session,
        payload,
        current_user,
    ) -> ServiceRequest:
        assert payload.requester_name == "Ayesha Rahman"
        assert current_user.id == user.id
        return expected_request

    monkeypatch.setattr(
        request_router_module,
        "create_request",
        fake_create_request,
    )

    set_overrides(user)

    try:
        response = client.post(
            "/requests",
            json={
                "title": "Printer not working",
                "description": (
                    "The third-floor office printer "
                    "is jammed."
                ),
                "requester_name": "Ayesha Rahman",
                "priority": "medium",
            },
        )
    finally:
        clear_overrides()

    assert response.status_code == 201
    assert response.json()["id"] == 42
    assert response.json()["status"] == "pending"
    assert (
        response.json()["requester_name"]
        == "Ayesha Rahman"
    )
    assert (
        response.json()["creator"]["email"]
        == "operator@example.com"
    )


def test_list_requests_passes_combined_filters(
    monkeypatch,
) -> None:
    user = build_user()
    expected_request = build_request(user)

    async def fake_list_requests(
        session,
        status,
        priority,
        query,
    ):
        assert status == RequestStatus.PENDING
        assert priority == RequestPriority.MEDIUM
        assert query == "ayesha"
        return [expected_request]

    monkeypatch.setattr(
        request_router_module,
        "list_requests",
        fake_list_requests,
    )

    set_overrides(user)

    try:
        response = client.get(
            (
                "/requests?"
                "status=pending&"
                "priority=medium&"
                "q=ayesha"
            )
        )
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_request_details_not_found_returns_404(
    monkeypatch,
) -> None:
    user = build_user()

    async def fake_get_request_by_id(
        session,
        request_id,
    ):
        raise RequestNotFoundError(
            "Service request not found."
        )

    monkeypatch.setattr(
        request_router_module,
        "get_request_by_id",
        fake_get_request_by_id,
    )

    set_overrides(user)

    try:
        response = client.get("/requests/999")
    finally:
        clear_overrides()

    assert response.status_code == 404


def test_status_update_permission_error_returns_403(
    monkeypatch,
) -> None:
    user = build_user()

    async def fake_update(
        session,
        request_id,
        requested_status,
        current_user,
    ):
        raise RequestPermissionError(
            (
                "Operators may modify only requests "
                "they created."
            )
        )

    monkeypatch.setattr(
        request_router_module,
        "manually_update_request_status",
        fake_update,
    )

    set_overrides(user)

    try:
        response = client.patch(
            "/requests/42/status",
            json={"status": "in_progress"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 403


def test_invalid_transition_returns_409(
    monkeypatch,
) -> None:
    user = build_user()

    async def fake_update(
        session,
        request_id,
        requested_status,
        current_user,
    ):
        raise RequestConflictError(
            (
                "Transition from 'pending' to "
                "'completed' is not allowed."
            )
        )

    monkeypatch.setattr(
        request_router_module,
        "manually_update_request_status",
        fake_update,
    )

    set_overrides(user)

    try:
        response = client.patch(
            "/requests/42/status",
            json={"status": "completed"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 409


def test_cancel_request_returns_cancelled_status(
    monkeypatch,
) -> None:
    user = build_user()
    cancelled_request = build_request(
        owner=user,
        status=RequestStatus.CANCELLED,
    )

    async def fake_cancel(
        session,
        request_id,
        current_user,
    ) -> ServiceRequest:
        return cancelled_request

    monkeypatch.setattr(
        request_router_module,
        "cancel_request",
        fake_cancel,
    )

    set_overrides(user)

    try:
        response = client.delete("/requests/42")
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


def test_request_api_requires_authentication() -> None:
    response = client.get("/requests")

    assert response.status_code == 401