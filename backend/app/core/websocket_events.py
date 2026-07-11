from datetime import datetime, timezone
from typing import Any

from app.db.models import ServiceRequest


def serialize_datetime(value: datetime) -> str:
    """Return one timezone-aware ISO 8601 timestamp."""

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    return value.isoformat().replace("+00:00", "Z")


def build_connection_established_event(
    user_id: int,
    role: str,
) -> dict[str, Any]:
    """Build the initial successful-connection event."""

    return {
        "type": "connection_established",
        "data": {
            "user_id": user_id,
            "role": role,
        },
    }


def build_request_created_event(
    service_request: ServiceRequest,
) -> dict[str, Any]:
    """Build an event containing a newly committed request."""

    return {
        "type": "request_created",
        "data": {
            "id": service_request.id,
            "title": service_request.title,
            "description": service_request.description,
            "requester_name": service_request.requester_name,
            "priority": service_request.priority.value,
            "status": service_request.status.value,
            "created_by": service_request.created_by,
            "created_at": serialize_datetime(
                service_request.created_at
            ),
            "updated_at": serialize_datetime(
                service_request.updated_at
            ),
        },
    }


def build_request_updated_event(
    service_request: ServiceRequest,
) -> dict[str, Any]:
    """Build an event for one committed status transition."""

    return {
        "type": "request_updated",
        "data": {
            "id": service_request.id,
            "status": service_request.status.value,
            "updated_at": serialize_datetime(
                service_request.updated_at
            ),
        },
    }