import asyncio

import app.core.background_processing as processor
from app.db.models import RequestStatus


def test_pending_request_progresses_to_completed(
    monkeypatch,
) -> None:
    persisted_status = RequestStatus.PENDING
    transitions: list[
        tuple[int, RequestStatus]
    ] = []

    async def fake_load_request_status(
        request_id: int,
    ) -> RequestStatus:
        assert request_id == 42
        return persisted_status

    async def fake_attempt_transition(
        request_id: int,
        requested_status: RequestStatus,
    ) -> bool:
        nonlocal persisted_status

        transitions.append(
            (request_id, requested_status)
        )

        persisted_status = requested_status

        return True

    async def fake_sleep(
        delay: float,
    ) -> None:
        assert delay >= 0

    monkeypatch.setattr(
        processor,
        "load_request_status",
        fake_load_request_status,
    )
    monkeypatch.setattr(
        processor,
        "attempt_automatic_transition",
        fake_attempt_transition,
    )
    monkeypatch.setattr(
        processor.asyncio,
        "sleep",
        fake_sleep,
    )

    asyncio.run(processor.process_request(42))

    assert transitions == [
        (
            42,
            RequestStatus.IN_PROGRESS,
        ),
        (
            42,
            RequestStatus.COMPLETED,
        ),
    ]

    assert persisted_status == RequestStatus.COMPLETED


def test_cancelled_request_stops_before_first_transition(
    monkeypatch,
) -> None:
    persisted_status = RequestStatus.PENDING
    transitions: list[RequestStatus] = []

    async def fake_load_request_status(
        request_id: int,
    ) -> RequestStatus:
        return persisted_status

    async def fake_attempt_transition(
        request_id: int,
        requested_status: RequestStatus,
    ) -> bool:
        transitions.append(requested_status)
        return True

    async def fake_sleep(
        delay: float,
    ) -> None:
        nonlocal persisted_status
        persisted_status = RequestStatus.CANCELLED

    monkeypatch.setattr(
        processor,
        "load_request_status",
        fake_load_request_status,
    )
    monkeypatch.setattr(
        processor,
        "attempt_automatic_transition",
        fake_attempt_transition,
    )
    monkeypatch.setattr(
        processor.asyncio,
        "sleep",
        fake_sleep,
    )

    asyncio.run(processor.process_request(10))

    assert transitions == []


def test_recovered_in_progress_request_does_not_reset_to_pending(
    monkeypatch,
) -> None:
    persisted_status = RequestStatus.IN_PROGRESS
    transitions: list[RequestStatus] = []

    async def fake_load_request_status(
        request_id: int,
    ) -> RequestStatus:
        return persisted_status

    async def fake_attempt_transition(
        request_id: int,
        requested_status: RequestStatus,
    ) -> bool:
        nonlocal persisted_status

        transitions.append(requested_status)
        persisted_status = requested_status

        return True

    async def fake_sleep(
        delay: float,
    ) -> None:
        return None

    monkeypatch.setattr(
        processor,
        "load_request_status",
        fake_load_request_status,
    )
    monkeypatch.setattr(
        processor,
        "attempt_automatic_transition",
        fake_attempt_transition,
    )
    monkeypatch.setattr(
        processor.asyncio,
        "sleep",
        fake_sleep,
    )

    asyncio.run(processor.process_request(15))

    assert transitions == [
        RequestStatus.COMPLETED,
    ]


def test_terminal_request_is_ignored(
    monkeypatch,
) -> None:
    transitions: list[RequestStatus] = []

    async def fake_load_request_status(
        request_id: int,
    ) -> RequestStatus:
        return RequestStatus.COMPLETED

    async def fake_attempt_transition(
        request_id: int,
        requested_status: RequestStatus,
    ) -> bool:
        transitions.append(requested_status)
        return True

    monkeypatch.setattr(
        processor,
        "load_request_status",
        fake_load_request_status,
    )
    monkeypatch.setattr(
        processor,
        "attempt_automatic_transition",
        fake_attempt_transition,
    )

    asyncio.run(processor.process_request(20))

    assert transitions == []