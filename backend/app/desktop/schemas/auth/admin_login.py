# admin_login.py
from pydantic import BaseModel, EmailStr, Field, constr
from typing import Literal

class AdminLoginRequest(BaseModel):
    email: EmailStr = Field(max_length=254)
    password: str
    agency: Literal["fda", "lea"]

class AdminOTPVerifyRequest(BaseModel):
    email: EmailStr = Field(max_length=254)
    otp: constr(min_length=6, max_length=6, pattern=r"^\d{6}$")