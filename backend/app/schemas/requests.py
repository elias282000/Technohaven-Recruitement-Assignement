from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)

from app.db.models import (
    RequestPriority,
    RequestStatus,
)


def strip_and_validate_text(
    value: str,
    field_label: str,
) -> str:
    """Strip surrounding whitespace and reject blank text."""

    stripped_value = value.strip()

    if not stripped_value:
        raise ValueError(
            f"{field_label} must not be blank."
        )

    return stripped_value


class RequestCreate(BaseModel):
    title: str = Field(
        min_length=3,
        max_length=200,
    )

    description: str = Field(
        min_length=10,
        max_length=5000,
    )

    requester_name: str = Field(
        min_length=2,
        max_length=150,
    )

    priority: RequestPriority

    @field_validator(
        "title",
        "description",
        "requester_name",
        mode="before",
    )
    @classmethod
    def reject_non_string_text(
        cls,
        value: object,
    ) -> object:
        if not isinstance(value, str):
            raise ValueError(
                "The value must be a string."
            )

        return value

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        return strip_and_validate_text(
            value,
            "Title",
        )

    @field_validator("description")
    @classmethod
    def normalize_description(
        cls,
        value: str,
    ) -> str:
        return strip_and_validate_text(
            value,
            "Description",
        )

    @field_validator("requester_name")
    @classmethod
    def normalize_requester_name(
        cls,
        value: str,
    ) -> str:
        return strip_and_validate_text(
            value,
            "Requester name",
        )


class RequestStatusUpdate(BaseModel):
    status: RequestStatus


class RequestCreatorResponse(BaseModel):
    id: int
    email: str

    model_config = ConfigDict(
        from_attributes=True,
    )


class RequestResponse(BaseModel):
    id: int
    title: str
    description: str
    requester_name: str
    priority: RequestPriority
    status: RequestStatus
    created_by: int
    created_at: datetime
    updated_at: datetime
    creator: RequestCreatorResponse

    model_config = ConfigDict(
        from_attributes=True,
    )


class RequestStatusHistoryResponse(BaseModel):
    id: int
    request_id: int
    old_status: RequestStatus
    new_status: RequestStatus
    changed_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )