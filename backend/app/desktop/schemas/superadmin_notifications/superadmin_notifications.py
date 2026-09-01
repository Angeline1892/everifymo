from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.desktop.schemas.superadmin_notifications.notification_enums import (
    NotificationEventType,
)


class NotificationOut(BaseModel):
    """
    Shape of a single notification returned to the frontend.

    Covers both real DB rows (from superadmin_notifications) and computed,
    non-persisted entries (invite_not_activated / invite_expired), which is
    why notification_id is Optional - those two are generated fresh on
    every request rather than stored.
    """

    model_config = ConfigDict(from_attributes=True)

    notification_id: Optional[UUID] = None
    event_type: NotificationEventType
    title: str
    message: str
    related_user_id: Optional[UUID] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    """
    Wrapper returned by GET /notifications - the list itself plus the
    unread count, so the frontend doesn't need a second request just to
    know how many are unread.
    """

    notifications: List[NotificationOut]
    unread_count: int


class UnreadCountResponse(BaseModel):
    """
    Lightweight response for GET /notifications/unread-count - used for
    the polling badge, kept separate from the full list so polling every
    ~30s doesn't pull the full notification payload each time.
    """

    unread_count: int


class MarkReadResponse(BaseModel):
    """
    Response for PATCH /notifications/{id}/read and
    PATCH /notifications/read-all.
    """

    success: bool
    unread_count: int