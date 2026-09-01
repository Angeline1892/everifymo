# backend/app/desktop/schemas/auth/personnel_login.py   
from pydantic import BaseModel, EmailStr
from typing import Literal


class PersonnelLoginRequest(BaseModel):
    email: EmailStr
    password: str
    agency: Literal["fda", "lea"]


class PersonnelOTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str