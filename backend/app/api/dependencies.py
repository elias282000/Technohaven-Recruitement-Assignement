from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    InvalidTokenError,
    decode_access_token,
)
from app.db.database import get_db_session
from app.db.models import User

bearer_scheme = HTTPBearer(
    scheme_name="Bearer authentication",
    description="Enter the JWT access token.",
    auto_error=False,
)

DatabaseSession = Annotated[
    AsyncSession,
    Depends(get_db_session),
]

BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(bearer_scheme),
]


def authentication_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    credentials: BearerCredentials,
    session: DatabaseSession,
) -> User:
    """Resolve the authenticated database user from a bearer JWT."""

    if credentials is None:
        raise authentication_exception()

    if credentials.scheme.lower() != "bearer":
        raise authentication_exception()

    try:
        user_id = decode_access_token(
            credentials.credentials
        )
    except InvalidTokenError as exc:
        raise authentication_exception() from exc

    user = await session.get(User, user_id)

    if user is None:
        raise authentication_exception()

    return user


CurrentUser = Annotated[
    User,
    Depends(get_current_user),
]