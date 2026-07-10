from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.db.models import UserRole

settings = get_settings()

password_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


class InvalidTokenError(Exception):
    """Raised when an access token cannot be trusted."""


def validate_password_for_hashing(password: str) -> None:
    """Validate password length before passing it to bcrypt."""

    if len(password) < 8:
        raise ValueError(
            "Password must contain at least 8 characters."
        )

    if len(password.encode("utf-8")) > 72:
        raise ValueError(
            "Password must not exceed 72 UTF-8 bytes."
        )


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""

    validate_password_for_hashing(password)
    return password_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """Compare a plaintext password with its stored hash."""

    try:
        return password_context.verify(
            plain_password,
            hashed_password,
        )
    except (TypeError, ValueError):
        return False


def create_access_token(
    user_id: int,
    role: UserRole,
) -> str:
    """Create a signed, expiring JWT access token."""

    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role.value,
        "type": "access",
        "iat": issued_at,
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> int:
    """Validate a JWT and return its authenticated user ID."""

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise InvalidTokenError(
            "The access token is invalid or expired."
        ) from exc

    if payload.get("type") != "access":
        raise InvalidTokenError(
            "The token is not an access token."
        )

    subject = payload.get("sub")

    if not isinstance(subject, str):
        raise InvalidTokenError(
            "The token subject is missing."
        )

    try:
        user_id = int(subject)
    except ValueError as exc:
        raise InvalidTokenError(
            "The token subject is invalid."
        ) from exc

    if user_id <= 0:
        raise InvalidTokenError(
            "The token subject is invalid."
        )

    return user_id