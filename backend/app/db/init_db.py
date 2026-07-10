import asyncio

from app.db.database import Base, engine
from app.db import models  # noqa: F401


async def create_tables() -> None:
    """Create tables declared in SQLAlchemy metadata."""

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_tables())
    print("Database tables created successfully.")