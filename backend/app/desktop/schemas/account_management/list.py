from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class AccountListItem(BaseModel):
    user_id: UUID
    first_name: str | None = None
    middle_name: str | None = None
    last_name: str | None = None
    email: str
    agency: str | None = None
    region: str | None = None
    department: str | None = None
    position: str | None = None
    employee_id: str | None = None
    contact_number: str | None = None
    invitation_date: datetime | None = None
    expiration_date: datetime | None = None
    status: str
    is_locked: bool
    is_active: bool 
    created_by: str | None = None
    created_by_is_national_admin: bool = False


class AccountSummary(BaseModel):
    total: int
    active: int
    suspended: int