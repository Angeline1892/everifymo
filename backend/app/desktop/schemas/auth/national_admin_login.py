# backend/app/desktop/schemas/auth/national_admin_login.py
from pydantic import BaseModel, EmailStr


class NationalAdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class NationalAdminOTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str