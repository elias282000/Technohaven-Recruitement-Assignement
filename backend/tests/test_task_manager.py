import asyncio

from app.core.task_manager import TaskManager


def test_task_manager_prevents_duplicate_active_tasks(
    monkeypatch,
) -> None:
    processing_started = asyncio.Event()
    release_processing = asyncio.Event()

    async def fake_process_request(
        request_id: int,
    ) -> None:
        assert request_id == 42
        processing_started.set()
        await release_processing.wait()

    monkeypatch.setattr(
        "app.core.background_processing.process_request",
        fake_process_request,
    )

    async def scenario() -> None:
        manager = TaskManager()

        first_result = manager.schedule(42)

        await processing_started.wait()

        second_result = manager.schedule(42)

        assert first_result is True
        assert second_result is False
        assert manager.is_scheduled(42) is True
        assert manager.active_request_ids() == {42}
        assert manager.active_count == 1

        release_processing.set()

        await asyncio.sleep(0)
        await asyncio.sleep(0)

        assert manager.is_scheduled(42) is False
        assert manager.active_count == 0

    asyncio.run(scenario())


def test_task_manager_allows_rescheduling_after_completion(
    monkeypatch,
) -> None:
    execution_count = 0

    async def fake_process_request(
        request_id: int,
    ) -> None:
        nonlocal execution_count

        assert request_id == 7
        execution_count += 1

    monkeypatch.setattr(
        "app.core.background_processing.process_request",
        fake_process_request,
    )

    async def scenario() -> None:
        manager = TaskManager()

        assert manager.schedule(7) is True

        await asyncio.sleep(0)
        await asyncio.sleep(0)

        assert manager.is_scheduled(7) is False

        assert manager.schedule(7) is True

        await asyncio.sleep(0)
        await asyncio.sleep(0)

        assert execution_count == 2

    asyncio.run(scenario())


def test_cancel_all_stops_active_tasks(
    monkeypatch,
) -> None:
    task_started = asyncio.Event()

    async def fake_process_request(
        request_id: int,
    ) -> None:
        task_started.set()
        await asyncio.sleep(100)

    monkeypatch.setattr(
        "app.core.background_processing.process_request",
        fake_process_request,
    )

    async def scenario() -> None:
        manager = TaskManager()

        manager.schedule(99)

        await task_started.wait()

        assert manager.active_count == 1

        await manager.cancel_all()

        assert manager.active_count == 0
        assert manager.active_request_ids() == set()

    asyncio.run(scenario())