from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.db.models import User


def normalize_email(email: str) -> str:
    """Normalize email input before database comparison."""

    return email.strip().lower()


async def get_user_by_email(
    session: AsyncSession,
    email: str,
) -> User | None:
    """Find one user by normalized email address."""

    statement = select(User).where(
        User.email == normalize_email(email)
    )

    result = await session.execute(statement)

    return result.scalar_one_or_none()


async def authenticate_user(
    session: AsyncSession,
    email: str,
    password: str,
) -> User | None:
    """Validate login credentials without revealing failure details."""

    user = await get_user_by_email(
        session=session,
        email=email,
    )

    if user is None:
        return None

    if not verify_password(
        plain_password=password,
        hashed_password=user.hashed_password,
    ):
        return None

    return user