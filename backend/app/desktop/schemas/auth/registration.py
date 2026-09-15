# backend/app/desktop/schemas/auth/registration.py
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator
from enum import Enum

from app.core.security import validate_password_strength


class TokenStatus(str, Enum):
    valid = "valid"
    expired = "expired"
    used = "used"
    invalid = "invalid"


class ValidateTokenResponse(BaseModel):
    status: TokenStatus
    message: str | None = None

    email: str | None = None
    role: str | None = None
    region_id: UUID | None = None
    region_name: str | None = None
    resend_already_requested: bool = False


class RegistrationCompleteRequest(BaseModel):
    """Password-only now — the admin who created this account already
    supplied first/last/position/employee_id/contact_number/department."""
    invite_token: str
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class RegistrationCompleteResponse(BaseModel):
    message: str
    status: str


class ResendInviteRequest(BaseModel):
    invite_token: str


class ResendInviteResponse(BaseModel):
    message: str


class RequestResendRequest(BaseModel):
    invite_token: str


class RequestResendResponse(BaseModel):
    message: str