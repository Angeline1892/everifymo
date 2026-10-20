from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
import uuid
from app.core.security import validate_password_strength


class ProfileResponse(BaseModel):
    user_id: uuid.UUID
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    employee_id: Optional[str] = None
    email: EmailStr
    contact_number: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    role: str
    agency: str  # derived display label from role
    region: Optional[str] = None  # derived from Region.region_name

    class Config:
        from_attributes = True


class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50, pattern=r"^[A-Za-zÀ-ÖØ-öø-ÿ'.\- ]+$")
    middle_name: Optional[str] = Field(None, max_length=50, pattern=r"^[A-Za-zÀ-ÖØ-öø-ÿ'.\- ]+$")
    last_name: Optional[str] = Field(None, min_length=1, max_length=50, pattern=r"^[A-Za-zÀ-ÖØ-öø-ÿ'.\- ]+$")
    employee_id: Optional[str] = Field(None, max_length=20)
    contact_number: Optional[str] = Field(None, min_length=11, max_length=11, pattern=r"^09\d{9}$")
    department: Optional[str] = Field(None, max_length=150)
    position: Optional[str] = Field(None, max_length=150)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=64)

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)