# personnel_login.py
from pydantic import BaseModel, EmailStr, Field, constr
from typing import Literal, Optional

class PersonnelLoginRequest(BaseModel):
    email: EmailStr = Field(max_length=254)
    password: str
    agency: Literal["fda", "lea"]
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source: Optional[str] = Field(default="gps", max_length=300)

class PersonnelOTPVerifyRequest(BaseModel):
    email: EmailStr = Field(max_length=254)
    otp: constr(min_length=6, max_length=6, pattern=r"^\d{6}$")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source: Optional[str] = Field(default="gps", max_length=300)