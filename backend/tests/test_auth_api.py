from datetime import datetime, timezone
from typing import AsyncIterator

from fastapi.testclient import TestClient

import app.api.auth as auth_router_module
from app.api.dependencies import get_current_user
from app.db.database import get_db_session
from app.db.models import User, UserRole
from app.main import app

client = TestClient(app)


def build_test_user() -> User:
    return User(
        id=7,
        email="operator@example.com",
        hashed_password="$2b$test-placeholder",
        role=UserRole.OPERATOR,
        created_at=datetime.now(timezone.utc),
    )


async def override_db_session() -> AsyncIterator[None]:
    yield None


def test_login_returns_access_token(
    monkeypatch,
) -> None:
    test_user = build_test_user()

    async def fake_authenticate_user(
        session,
        email: str,
        password: str,
    ) -> User | None:
        assert email == "operator@example.com"
        assert password == "SecurePassword123!"
        return test_user

    monkeypatch.setattr(
        auth_router_module,
        "authenticate_user",
        fake_authenticate_user,
    )

    app.dependency_overrides[
        get_db_session
    ] = override_db_session

    try:
        response = client.post(
            "/auth/login",
            json={
                "email": "operator@example.com",
                "password": "SecurePassword123!",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200

    body = response.json()

    assert isinstance(body["access_token"], str)
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0


def test_invalid_login_returns_401(
    monkeypatch,
) -> None:
    async def fake_authenticate_user(
        session,
        email: str,
        password: str,
    ) -> None:
        return None

    monkeypatch.setattr(
        auth_router_module,
        "authenticate_user",
        fake_authenticate_user,
    )

    app.dependency_overrides[
        get_db_session
    ] = override_db_session

    try:
        response = client.post(
            "/auth/login",
            json={
                "email": "unknown@example.com",
                "password": "IncorrectPassword123!",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Invalid email or password."
    }


def test_get_me_returns_authenticated_user() -> None:
    test_user = build_test_user()

    app.dependency_overrides[
        get_current_user
    ] = lambda: test_user

    try:
        response = client.get("/auth/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["id"] == 7
    assert (
        response.json()["email"]
        == "operator@example.com"
    )
    assert response.json()["role"] == "operator"
    assert "hashed_password" not in response.json()


def test_get_me_without_token_returns_401() -> None:
    response = client.get("/auth/me")

    assert response.status_code == 401
    assert response.json() == {
        "detail": (
            "Could not validate authentication credentials."
        )
    }


def test_login_rejects_invalid_email_shape() -> None:
    response = client.post(
        "/auth/login",
        json={
            "email": "not-an-email",
            "password": "SecurePassword123!",
        },
    )

    assert response.status_code == 422