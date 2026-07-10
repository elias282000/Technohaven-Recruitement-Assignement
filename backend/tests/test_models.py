from sqlalchemy import Enum as SqlEnum

from app.db.database import Base
from app.db.models import (
    RequestPriority,
    RequestStatus,
    RequestStatusHistory,
    ServiceRequest,
    User,
    UserRole,
)


def test_expected_tables_are_registered() -> None:
    assert set(Base.metadata.tables) == {
        "users",
        "service_requests",
        "request_status_history",
    }


def test_user_model_columns() -> None:
    columns = User.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "email",
        "hashed_password",
        "role",
        "created_at",
    }

    assert columns.email.nullable is False
    assert columns.hashed_password.nullable is False
    assert columns.role.nullable is False


def test_service_request_model_columns() -> None:
    columns = ServiceRequest.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "title",
        "description",
        "requester_name",
        "priority",
        "status",
        "created_by",
        "created_at",
        "updated_at",
    }

    assert columns.requester_name.nullable is False
    assert columns.created_by.nullable is False
    assert columns.status.server_default is not None


def test_status_history_model_columns() -> None:
    columns = RequestStatusHistory.__table__.columns

    assert set(columns.keys()) == {
        "id",
        "request_id",
        "old_status",
        "new_status",
        "changed_at",
    }

    assert columns.request_id.nullable is False
    assert columns.old_status.nullable is False
    assert columns.new_status.nullable is False


def test_enum_values() -> None:
    assert {role.value for role in UserRole} == {
        "operator",
        "supervisor",
    }

    assert {priority.value for priority in RequestPriority} == {
        "low",
        "medium",
        "high",
    }

    assert {status.value for status in RequestStatus} == {
        "pending",
        "in_progress",
        "completed",
        "cancelled",
    }


def test_enum_columns_validate_strings() -> None:
    role_type = User.__table__.columns.role.type
    priority_type = ServiceRequest.__table__.columns.priority.type
    status_type = ServiceRequest.__table__.columns.status.type

    assert isinstance(role_type, SqlEnum)
    assert isinstance(priority_type, SqlEnum)
    assert isinstance(status_type, SqlEnum)

    assert role_type.validate_strings is True
    assert priority_type.validate_strings is True
    assert status_type.validate_strings is True


def test_foreign_keys() -> None:
    created_by_foreign_key = next(
        iter(ServiceRequest.__table__.columns.created_by.foreign_keys)
    )

    history_foreign_key = next(
        iter(
            RequestStatusHistory
            .__table__
            .columns
            .request_id
            .foreign_keys
        )
    )

    assert created_by_foreign_key.target_fullname == "users.id"
    assert created_by_foreign_key.ondelete == "RESTRICT"

    assert (
        history_foreign_key.target_fullname
        == "service_requests.id"
    )
    assert history_foreign_key.ondelete == "CASCADE"