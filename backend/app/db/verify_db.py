import asyncio

from sqlalchemy import text

from app.db.database import engine

EXPECTED_TABLES = {
    "users",
    "service_requests",
    "request_status_history",
}


async def verify_database() -> None:
    """Verify connectivity and the required table structure."""

    async with engine.connect() as connection:
        database_name = await connection.scalar(
            text("SELECT current_database()")
        )

        current_user = await connection.scalar(
            text("SELECT current_user")
        )

        table_result = await connection.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
                """
            )
        )

        existing_tables = {
            row.table_name
            for row in table_result
        }

    await engine.dispose()

    missing_tables = EXPECTED_TABLES - existing_tables

    if missing_tables:
        missing_names = ", ".join(sorted(missing_tables))
        raise RuntimeError(
            f"Database is missing required tables: {missing_names}"
        )

    print(f"Database: {database_name}")
    print(f"Connected user: {current_user}")
    print("Required tables:")

    for table_name in sorted(EXPECTED_TABLES):
        print(f"  - {table_name}")

    print("Database verification passed.")


if __name__ == "__main__":
    asyncio.run(verify_database())