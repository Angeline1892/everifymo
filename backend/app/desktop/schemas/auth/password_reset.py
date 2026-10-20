from pydantic import BaseModel, EmailStr, Field, constr, field_validator
from typing import Literal
from app.core.security import validate_password_strength


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(max_length=254)
    portal: Literal["national-admin", "interagency-admin", "personnel"]

class VerifyResetOtpRequest(BaseModel):
    email: EmailStr = Field(max_length=254)
    otp: constr(min_length=6, max_length=6, pattern=r"^\d{6}$")
    portal: Literal["national-admin", "interagency-admin", "personnel"]

class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(max_length=254)
    otp: constr(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(..., min_length=8, max_length=64)
    portal: Literal["national-admin", "interagency-admin", "personnel"]

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)