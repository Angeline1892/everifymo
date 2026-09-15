from pydantic import BaseModel, EmailStr, constr, field_validator
from typing import Literal
from app.core.security import validate_password_strength


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    portal: Literal["national-admin", "interagency-admin", "personnel"]

class VerifyResetOtpRequest(BaseModel):
    email: EmailStr
    otp: constr(min_length=4)
    portal: Literal["national-admin", "interagency-admin", "personnel"]

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: constr(min_length=4)
    new_password: str
    portal: Literal["national-admin", "interagency-admin", "personnel"]

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)