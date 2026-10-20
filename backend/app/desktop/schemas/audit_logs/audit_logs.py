# backend/app/desktop/schemas/audit_logs/audit_logs.py
from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel


class AuditLogItem(BaseModel):
    log_id: UUID
    timestamp: datetime
    user_id: Optional[UUID]
    user_name: Optional[str]
    user_email: Optional[str]
    user_role: str
    agency: str
    region_code: Optional[str]
    action: str
    target_table: Optional[str]
    target_reference: Optional[str]
    target_id: Optional[UUID]
    ip_address: Optional[str]
    user_agent: Optional[str]
    old_value: Optional[dict[str, Any]]
    new_value: Optional[dict[str, Any]]

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: list[AuditLogItem]
    total: int
    page: int
    limit: int
    total_pages: int