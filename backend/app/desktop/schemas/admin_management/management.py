# backend/app/desktop/schemas/admin_management/management.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
import uuid


class InviteSuperadminRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr


class SuperadminListItem(BaseModel):
    admin_id: uuid.UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: EmailStr
    invitation_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    status: str
    is_locked: bool

    class Config:
        from_attributes = True


class SuperadminSummary(BaseModel):
    total_admins: int
    active: int
    invited: int
    invitation_expired: int
    suspended: int