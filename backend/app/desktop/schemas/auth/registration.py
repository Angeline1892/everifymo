# backend/app/desktop/schemas/auth/registration.py
from uuid import UUID

from pydantic import BaseModel, Field
from enum import Enum


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
    invite_token: str

    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    position: str = Field(..., min_length=1, max_length=150)

    middle_name: str | None = Field(None, max_length=100)
    employee_id: str | None = Field(None, max_length=50)
    contact_number: str | None = Field(None, max_length=20)
    department: str | None = Field(None, max_length=150)


class RegistrationCompleteResponse(BaseModel):
    message: str
    status: str


class ResendInviteRequest(BaseModel):
    invite_token: str


class ResendInviteResponse(BaseModel):
    message: str

# added for resend request and response
class RequestResendRequest(BaseModel):
    invite_token: str

class RequestResendResponse(BaseModel):
    message: str