import asyncio
import logging
from dataclasses import dataclass
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class WebSocketConnection:
    """Store one authenticated WebSocket connection."""

    websocket: WebSocket
    user_id: int


class WebSocketManager:
    """Manage authenticated WebSocket clients."""

    def __init__(self) -> None:
        self._connections: dict[
            int,
            WebSocketConnection,
        ] = {}
        self._next_connection_id = 1
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        user_id: int,
    ) -> int:
        """Accept and register one authenticated connection."""

        await websocket.accept()

        async with self._lock:
            connection_id = self._next_connection_id
            self._next_connection_id += 1

            self._connections[connection_id] = (
                WebSocketConnection(
                    websocket=websocket,
                    user_id=user_id,
                )
            )

        logger.info(
            "WebSocket connection %s registered for user %s.",
            connection_id,
            user_id,
        )

        return connection_id

    async def disconnect(
        self,
        connection_id: int,
    ) -> None:
        """Remove one connection if it is registered."""

        async with self._lock:
            connection = self._connections.pop(
                connection_id,
                None,
            )

        if connection is not None:
            logger.info(
                "WebSocket connection %s disconnected.",
                connection_id,
            )

    async def send_json(
        self,
        connection_id: int,
        event: dict[str, Any],
    ) -> bool:
        """Send one event to a registered connection."""

        async with self._lock:
            connection = self._connections.get(
                connection_id
            )

        if connection is None:
            return False

        try:
            await connection.websocket.send_json(event)
        except Exception:
            logger.exception(
                "Failed to send to WebSocket connection %s.",
                connection_id,
            )
            await self.disconnect(connection_id)
            return False

        return True

    async def broadcast(
        self,
        event: dict[str, Any],
    ) -> int:
        """
        Broadcast an event to all current connections.

        Returns the number of clients that received the event.
        """

        async with self._lock:
            connections = list(
                self._connections.items()
            )

        if not connections:
            return 0

        results = await asyncio.gather(
            *(
                self._send_to_connection(
                    connection_id=connection_id,
                    connection=connection,
                    event=event,
                )
                for connection_id, connection in connections
            ),
            return_exceptions=False,
        )

        return sum(results)

    async def _send_to_connection(
        self,
        connection_id: int,
        connection: WebSocketConnection,
        event: dict[str, Any],
    ) -> int:
        """Send safely and remove a failed client."""

        try:
            await connection.websocket.send_json(event)
        except Exception:
            logger.warning(
                "Removing failed WebSocket connection %s.",
                connection_id,
                exc_info=True,
            )

            await self.disconnect(connection_id)
            return 0

        return 1

    async def close_all(
        self,
        code: int = 1001,
    ) -> None:
        """Close and clear all clients during shutdown."""

        async with self._lock:
            connections = list(
                self._connections.values()
            )
            self._connections.clear()

        if not connections:
            return

        await asyncio.gather(
            *(
                self._close_connection(
                    connection.websocket,
                    code,
                )
                for connection in connections
            ),
            return_exceptions=True,
        )

    @staticmethod
    async def _close_connection(
        websocket: WebSocket,
        code: int,
    ) -> None:
        try:
            await websocket.close(code=code)
        except Exception:
            logger.debug(
                "WebSocket was already closed.",
                exc_info=True,
            )

    @property
    def connection_count(self) -> int:
        """Return the number of registered clients."""

        return len(self._connections)

    def connected_user_ids(self) -> set[int]:
        """Return IDs of users with active connections."""

        return {
            connection.user_id
            for connection in self._connections.values()
        }


websocket_manager = WebSocketManager()