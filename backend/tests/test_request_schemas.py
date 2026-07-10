import pytest
from pydantic import ValidationError

from app.db.models import RequestPriority
from app.schemas.requests import RequestCreate


def valid_payload() -> dict[str, object]:
    return {
        "title": "Printer not working",
        "description": (
            "The third-floor office printer is jammed."
        ),
        "requester_name": "Ayesha Rahman",
        "priority": RequestPriority.MEDIUM,
    }


def test_request_create_accepts_valid_payload() -> None:
    schema = RequestCreate(**valid_payload())

    assert schema.title == "Printer not working"
    assert schema.requester_name == "Ayesha Rahman"
    assert schema.priority == RequestPriority.MEDIUM


def test_request_create_strips_text_fields() -> None:
    payload = valid_payload()
    payload["title"] = "  Printer not working  "
    payload["requester_name"] = "  Ayesha Rahman  "

    schema = RequestCreate(**payload)

    assert schema.title == "Printer not working"
    assert schema.requester_name == "Ayesha Rahman"


@pytest.mark.parametrize(
    "field_name",
    [
        "title",
        "description",
        "requester_name",
    ],
)
def test_request_create_rejects_blank_text(
    field_name: str,
) -> None:
    payload = valid_payload()
    payload[field_name] = "   "

    with pytest.raises(ValidationError):
        RequestCreate(**payload)


def test_request_create_rejects_invalid_priority() -> None:
    payload = valid_payload()
    payload["priority"] = "urgent"

    with pytest.raises(ValidationError):
        RequestCreate(**payload)