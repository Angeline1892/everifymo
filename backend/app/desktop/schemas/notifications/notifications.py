from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    notification_id: UUID
    complaint_id: UUID | None
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class MarkReadResponse(BaseModel):
    notification_id: UUID
    is_read: bool
    unread_count: int


class MarkAllReadResponse(BaseModel):
    unread_count: int