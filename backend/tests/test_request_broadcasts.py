import asyncio
from datetime import datetime, timezone

from app.core.websocket_events import (
    build_request_updated_event,
)
from app.db.models import (
    RequestPriority,
    RequestStatus,
    ServiceRequest,
)


def test_updated_event_contains_committed_state() -> None:
    service_request = ServiceRequest(
        id=5,
        title="Network issue",
        description="The meeting-room network is down.",
        requester_name="Karim Hassan",
        priority=RequestPriority.HIGH,
        status=RequestStatus.COMPLETED,
        created_by=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    event = build_request_updated_event(
        service_request
    )

    assert event["data"]["id"] == 5
    assert event["data"]["status"] == "completed"


def test_broadcast_can_run_without_connections() -> None:
    from app.core.websocket_manager import (
        WebSocketManager,
    )

    async def scenario() -> None:
        manager = WebSocketManager()

        delivered_count = await manager.broadcast(
            {
                "type": "request_updated",
                "data": {
                    "id": 5,
                    "status": "completed",
                },
            }
        )

        assert delivered_count == 0

    asyncio.run(scenario())