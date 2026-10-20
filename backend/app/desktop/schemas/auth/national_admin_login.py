# national_admin_login.py
from pydantic import BaseModel, EmailStr, Field, constr

class NationalAdminLoginRequest(BaseModel):
    email: EmailStr = Field(max_length=254)
    password: str

class NationalAdminOTPVerifyRequest(BaseModel):
    email: EmailStr = Field(max_length=254)
    otp: constr(min_length=6, max_length=6, pattern=r"^\d{6}$")