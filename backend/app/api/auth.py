from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.models import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import authenticate_user

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

settings = get_settings()


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate a user",
)
async def login(
    payload: LoginRequest,
    session: DatabaseSession,
) -> TokenResponse:
    user = await authenticate_user(
        session=session,
        email=str(payload.email),
        password=payload.password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        user_id=user.id,
        role=user.role,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=(
            settings.access_token_expire_minutes * 60
        ),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the authenticated user",
)
async def get_me(
    current_user: CurrentUser,
) -> User:
    return current_user