import logging

from fastapi import (
    APIRouter,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)

from app.core.security import (
    InvalidTokenError,
    decode_access_token,
)
from app.core.websocket_events import (
    build_connection_established_event,
)
from app.core.websocket_manager import (
    websocket_manager,
)
from app.db.database import AsyncSessionFactory
from app.db.models import User

router = APIRouter()
logger = logging.getLogger(__name__)

AUTHENTICATION_CLOSE_CODE = status.WS_1008_POLICY_VIOLATION


async def authenticate_websocket_user(
    token: str,
) -> User | None:
    """Validate the JWT and load its current database user."""

    try:
        user_id = decode_access_token(token)
    except InvalidTokenError:
        return None

    async with AsyncSessionFactory() as session:
        return await session.get(User, user_id)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(default=None),
) -> None:
    """
    Register one authenticated real-time client.

    The route keeps receiving messages so disconnects are detected.
    Client messages are currently ignored because Step 6 requires
    server-to-client events only.
    """

    if token is None:
        await websocket.close(
            code=AUTHENTICATION_CLOSE_CODE
        )
        return

    user = await authenticate_websocket_user(token)

    if user is None:
        await websocket.close(
            code=AUTHENTICATION_CLOSE_CODE
        )
        return

    connection_id = await websocket_manager.connect(
        websocket=websocket,
        user_id=user.id,
    )

    await websocket_manager.send_json(
        connection_id=connection_id,
        event=build_connection_established_event(
            user_id=user.id,
            role=user.role.value,
        ),
    )

    try:
        while True:
            # Receiving keeps the route alive and lets Starlette
            # raise WebSocketDisconnect when the client closes.
            await websocket.receive_text()

    except WebSocketDisconnect:
        logger.info(
            "WebSocket client %s disconnected normally.",
            connection_id,
        )

    except Exception:
        logger.exception(
            "Unexpected WebSocket error for connection %s.",
            connection_id,
        )

    finally:
        await websocket_manager.disconnect(
            connection_id
        )