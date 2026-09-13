# backend/app/desktop/routers/admin_notifications/admin_notifications.py
"""
Endpoints for admin-side notifications - shared by National Admin,
FDA Admin, and LEA Admin workspaces. Which rows each admin actually sees
is entirely decided by the fan-out logic in admin_notification_service.py
at WRITE time - every endpoint here just reads back whatever was already
correctly scoped to current_admin.user_id, no extra filtering needed.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.core.dependencies import get_current_admin_or_national_admin
from app.models.users import User
from app.desktop.schemas.admin_notifications.admin_notifications import (
    NotificationListResponse,
    UnreadCountResponse,
    MarkReadResponse,
)
from app.desktop.services.admin_notifications import admin_notification_service as service

# Renamed from "/notifications" to avoid ambiguity now that the personnel
# side lives at "/personnel-notifications" in the same app - this prefix
# is explicit about which side it is.
router = APIRouter(prefix="/admin-notifications", tags=["Admin Notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_or_national_admin),
):
    """
    Returns this admin's notifications, newest first - stored rows
    merged with computed entries (invite_not_activated, invite_expired).
    Works identically for national_admin, fda_admin, and lea_admin - the
    service function branches on current_admin's own role/region.
    """
    notifications = service.get_notifications(
        db=db,
        current_admin=current_admin,
        limit=limit,
        offset=offset,
    )
    unread_count = service.get_unread_count(db=db, current_admin=current_admin)

    return NotificationListResponse(notifications=notifications, unread_count=unread_count)


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_or_national_admin),
):
    """Lightweight endpoint for the notification bell badge - meant to
    be polled on an interval without pulling the full list."""
    count = service.get_unread_count(db=db, current_admin=current_admin)
    return UnreadCountResponse(unread_count=count)


@router.patch("/{notification_id}/read", response_model=MarkReadResponse)
def mark_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_or_national_admin),
):
    """
    Marks a single stored notification as read. Only works for real DB
    rows - computed entries (invite_not_activated / invite_expired) have
    no persisted ID and can't be individually dismissed this way.
    """
    found = service.mark_notification_read(
        db=db,
        notification_id=notification_id,
        recipient_id=current_admin.user_id,
    )
    if not found:
        raise HTTPException(status_code=404, detail="Notification not found")

    unread_count = service.get_unread_count(db=db, current_admin=current_admin)
    return MarkReadResponse(success=True, unread_count=unread_count)


@router.patch("/read-all", response_model=MarkReadResponse)
def mark_all_read(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_or_national_admin),
):
    """Marks every unread stored notification as read for this admin."""
    service.mark_all_notifications_read(db=db, recipient_id=current_admin.user_id)
    unread_count = service.get_unread_count(db=db, current_admin=current_admin)
    return MarkReadResponse(success=True, unread_count=unread_count)