from pydantic import BaseModel, EmailStr, field_validator
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
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    employee_id: Optional[str] = None
    contact_number: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)