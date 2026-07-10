from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.core.config import get_settings
from app.core.security import (
    InvalidTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.db.models import UserRole

settings = get_settings()


def test_password_is_hashed_and_verified() -> None:
    password = "SecurePassword123!"
    hashed_password = hash_password(password)

    assert hashed_password != password
    assert verify_password(password, hashed_password) is True
    assert (
        verify_password(
            "IncorrectPassword123!",
            hashed_password,
        )
        is False
    )


def test_password_shorter_than_eight_characters_is_rejected() -> None:
    with pytest.raises(
        ValueError,
        match="at least 8 characters",
    ):
        hash_password("short")


def test_password_longer_than_bcrypt_limit_is_rejected() -> None:
    with pytest.raises(
        ValueError,
        match="72 UTF-8 bytes",
    ):
        hash_password("a" * 73)


def test_access_token_contains_valid_user_id() -> None:
    token = create_access_token(
        user_id=42,
        role=UserRole.OPERATOR,
    )

    assert decode_access_token(token) == 42


def test_invalid_access_token_is_rejected() -> None:
    with pytest.raises(InvalidTokenError):
        decode_access_token("not-a-valid-token")


def test_expired_access_token_is_rejected() -> None:
    expired_payload = {
        "sub": "42",
        "role": UserRole.OPERATOR.value,
        "type": "access",
        "iat": datetime.now(timezone.utc)
        - timedelta(minutes=10),
        "exp": datetime.now(timezone.utc)
        - timedelta(minutes=5),
    }

    token = jwt.encode(
        expired_payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_wrong_token_type_is_rejected() -> None:
    payload = {
        "sub": "42",
        "role": UserRole.OPERATOR.value,
        "type": "refresh",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc)
        + timedelta(minutes=5),
    }

    token = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(
        InvalidTokenError,
        match="not an access token",
    ):
        decode_access_token(token)