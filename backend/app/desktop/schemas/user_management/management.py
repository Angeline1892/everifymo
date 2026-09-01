from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid


class UserListItem(BaseModel):
    user_id: uuid.UUID
    fullname: Optional[str] = None
    first_name: Optional[str]
    last_name: Optional[str]
    employee_id: Optional[str]
    email: EmailStr
    agency: Optional[str] = None
    region: Optional[str] = None
    department: Optional[str]
    position: Optional[str]
    contact_number: Optional[str]
    display_status: str
    is_active: bool
    is_locked: bool

    class Config:
        from_attributes = True


class UserSummary(BaseModel):
    total_users: int
    active: int
    invited: int
    pending_approval: int
    suspended: int
    invite_requested: int