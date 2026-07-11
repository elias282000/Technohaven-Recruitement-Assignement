import asyncio
from typing import Any

from app.core.websocket_manager import (
    WebSocketManager,
)


class FakeWebSocket:
    def __init__(
        self,
        fail_sends: bool = False,
    ) -> None:
        self.accepted = False
        self.closed = False
        self.close_code: int | None = None
        self.fail_sends = fail_sends
        self.events: list[dict[str, Any]] = []

    async def accept(self) -> None:
        self.accepted = True

    async def send_json(
        self,
        event: dict[str, Any],
    ) -> None:
        if self.fail_sends:
            raise RuntimeError("Send failed.")

        self.events.append(event)

    async def close(
        self,
        code: int = 1000,
    ) -> None:
        self.closed = True
        self.close_code = code


def test_connect_and_disconnect() -> None:
    async def scenario() -> None:
        manager = WebSocketManager()
        websocket = FakeWebSocket()

        connection_id = await manager.connect(
            websocket=websocket,  # type: ignore[arg-type]
            user_id=7,
        )

        assert websocket.accepted is True
        assert manager.connection_count == 1
        assert manager.connected_user_ids() == {7}

        await manager.disconnect(connection_id)

        assert manager.connection_count == 0

    asyncio.run(scenario())


def test_multiple_connections_for_same_user() -> None:
    async def scenario() -> None:
        manager = WebSocketManager()

        first = FakeWebSocket()
        second = FakeWebSocket()

        first_id = await manager.connect(
            websocket=first,  # type: ignore[arg-type]
            user_id=1,
        )

        second_id = await manager.connect(
            websocket=second,  # type: ignore[arg-type]
            user_id=1,
        )

        assert first_id != second_id
        assert manager.connection_count == 2
        assert manager.connected_user_ids() == {1}

    asyncio.run(scenario())


def test_broadcast_reaches_all_healthy_clients() -> None:
    async def scenario() -> None:
        manager = WebSocketManager()

        first = FakeWebSocket()
        second = FakeWebSocket()

        await manager.connect(
            websocket=first,  # type: ignore[arg-type]
            user_id=1,
        )

        await manager.connect(
            websocket=second,  # type: ignore[arg-type]
            user_id=2,
        )

        event = {
            "type": "request_updated",
            "data": {
                "id": 42,
                "status": "completed",
            },
        }

        delivered_count = await manager.broadcast(
            event
        )

        assert delivered_count == 2
        assert first.events == [event]
        assert second.events == [event]

    asyncio.run(scenario())


def test_failed_client_is_removed_without_blocking_others() -> None:
    async def scenario() -> None:
        manager = WebSocketManager()

        healthy = FakeWebSocket()
        failing = FakeWebSocket(
            fail_sends=True
        )

        await manager.connect(
            websocket=healthy,  # type: ignore[arg-type]
            user_id=1,
        )

        await manager.connect(
            websocket=failing,  # type: ignore[arg-type]
            user_id=2,
        )

        event = {
            "type": "request_created",
            "data": {"id": 10},
        }

        delivered_count = await manager.broadcast(
            event
        )

        assert delivered_count == 1
        assert healthy.events == [event]
        assert manager.connection_count == 1
        assert manager.connected_user_ids() == {1}

    asyncio.run(scenario())


def test_close_all_closes_every_connection() -> None:
    async def scenario() -> None:
        manager = WebSocketManager()

        first = FakeWebSocket()
        second = FakeWebSocket()

        await manager.connect(
            websocket=first,  # type: ignore[arg-type]
            user_id=1,
        )

        await manager.connect(
            websocket=second,  # type: ignore[arg-type]
            user_id=2,
        )

        await manager.close_all()

        assert first.closed is True
        assert second.closed is True
        assert first.close_code == 1001
        assert second.close_code == 1001
        assert manager.connection_count == 0

    asyncio.run(scenario())