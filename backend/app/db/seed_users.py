import argparse
import asyncio
from getpass import getpass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.database import AsyncSessionFactory, engine
from app.db.models import User, UserRole
from app.services.auth_service import normalize_email


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Create or update initial Operator and "
            "Supervisor accounts."
        )
    )

    parser.add_argument(
        "--operator-email",
        default="operator@example.com",
    )
    parser.add_argument(
        "--supervisor-email",
        default="supervisor@example.com",
    )

    return parser.parse_args()


def prompt_password(label: str) -> str:
    password = getpass(f"{label} password: ")
    confirmation = getpass(f"Confirm {label} password: ")

    if password != confirmation:
        raise ValueError("The passwords do not match.")

    return password


async def upsert_user(
    session: AsyncSession,
    email: str,
    password: str,
    role: UserRole,
) -> str:
    normalized_email = normalize_email(email)

    result = await session.execute(
        select(User).where(
            User.email == normalized_email
        )
    )
    user = result.scalar_one_or_none()

    hashed_password = hash_password(password)

    if user is None:
        session.add(
            User(
                email=normalized_email,
                hashed_password=hashed_password,
                role=role,
            )
        )
        return "created"

    user.hashed_password = hashed_password
    user.role = role

    return "updated"


async def seed_users(
    operator_email: str,
    operator_password: str,
    supervisor_email: str,
    supervisor_password: str,
) -> None:
    async with AsyncSessionFactory() as session:
        try:
            operator_result = await upsert_user(
                session=session,
                email=operator_email,
                password=operator_password,
                role=UserRole.OPERATOR,
            )

            supervisor_result = await upsert_user(
                session=session,
                email=supervisor_email,
                password=supervisor_password,
                role=UserRole.SUPERVISOR,
            )

            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await engine.dispose()

    print(
        f"Operator {operator_result}: "
        f"{normalize_email(operator_email)}"
    )
    print(
        f"Supervisor {supervisor_result}: "
        f"{normalize_email(supervisor_email)}"
    )


def main() -> None:
    arguments = parse_arguments()

    operator_password = prompt_password("Operator")
    supervisor_password = prompt_password("Supervisor")

    asyncio.run(
        seed_users(
            operator_email=arguments.operator_email,
            operator_password=operator_password,
            supervisor_email=arguments.supervisor_email,
            supervisor_password=supervisor_password,
        )
    )


if __name__ == "__main__":
    main()