from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.db.models import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(
        min_length=1,
        max_length=128,
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)