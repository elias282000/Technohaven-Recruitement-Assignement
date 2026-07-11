from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

import app.api.websocket as websocket_module
from app.db.models import User, UserRole
from app.main import app

client = TestClient(app)


def build_user() -> User:
    return User(
        id=7,
        email="operator@example.com",
        hashed_password="$2b$placeholder",
        role=UserRole.OPERATOR,
        created_at=datetime.now(timezone.utc),
    )


def test_valid_websocket_receives_connection_event(
    monkeypatch,
) -> None:
    test_user = build_user()

    async def fake_authenticate(
        token: str,
    ) -> User | None:
        assert token == "valid-token"
        return test_user

    monkeypatch.setattr(
        websocket_module,
        "authenticate_websocket_user",
        fake_authenticate,
    )

    with client.websocket_connect(
        "/ws?token=valid-token"
    ) as websocket:
        event = websocket.receive_json()

        assert event == {
            "type": "connection_established",
            "data": {
                "user_id": 7,
                "role": "operator",
            },
        }


def test_invalid_websocket_token_is_rejected(
    monkeypatch,
) -> None:
    async def fake_authenticate(
        token: str,
    ) -> None:
        return None

    monkeypatch.setattr(
        websocket_module,
        "authenticate_websocket_user",
        fake_authenticate,
    )

    with pytest.raises(WebSocketDisconnect) as error:
        with client.websocket_connect(
            "/ws?token=invalid-token"
        ):
            pass

    assert error.value.code == 1008


def test_missing_websocket_token_is_rejected() -> None:
    with pytest.raises(WebSocketDisconnect) as error:
        with client.websocket_connect("/ws"):
            pass

    assert error.value.code == 1008