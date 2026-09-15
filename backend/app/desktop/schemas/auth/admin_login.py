# backend/app/desktop/schemas/auth/admin_login.py
from pydantic import BaseModel, EmailStr
from typing import Literal


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str
    agency: Literal["fda", "lea"]


class AdminOTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str