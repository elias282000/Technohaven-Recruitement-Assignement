from datetime import datetime, timezone

from app.core.websocket_events import (
    build_request_created_event,
    build_request_updated_event,
)
from app.db.models import (
    RequestPriority,
    RequestStatus,
    ServiceRequest,
)


def build_request() -> ServiceRequest:
    timestamp = datetime(
        2026,
        7,
        11,
        8,
        30,
        tzinfo=timezone.utc,
    )

    return ServiceRequest(
        id=42,
        title="Printer not working",
        description="The office printer is jammed.",
        requester_name="Ayesha Rahman",
        priority=RequestPriority.MEDIUM,
        status=RequestStatus.PENDING,
        created_by=1,
        created_at=timestamp,
        updated_at=timestamp,
    )


def test_request_created_event() -> None:
    event = build_request_created_event(
        build_request()
    )

    assert event["type"] == "request_created"
    assert event["data"]["id"] == 42
    assert (
        event["data"]["requester_name"]
        == "Ayesha Rahman"
    )
    assert event["data"]["status"] == "pending"
    assert event["data"]["priority"] == "medium"


def test_request_updated_event() -> None:
    service_request = build_request()
    service_request.status = (
        RequestStatus.IN_PROGRESS
    )

    event = build_request_updated_event(
        service_request
    )

    assert event == {
        "type": "request_updated",
        "data": {
            "id": 42,
            "status": "in_progress",
            "updated_at": "2026-07-11T08:30:00Z",
        },
    }