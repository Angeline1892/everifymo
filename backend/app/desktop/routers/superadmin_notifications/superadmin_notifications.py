import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.core.dependencies import get_current_superadmin
from app.models.users import User
from app.desktop.schemas.superadmin_notifications.superadmin_notifications import (
    NotificationListResponse,
    UnreadCountResponse,
    MarkReadResponse,
)
from app.desktop.services.superadmin_notifications import superadmin_notification_service as service

router = APIRouter(prefix="/notifications", tags=["Superadmin Notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_superadmin: User = Depends(get_current_superadmin),
):
    """
    Returns this superadmin's notifications, newest first - stored rows
    merged with computed entries (invite_not_activated, invite_expired).
    """
    notifications = service.get_notifications(
        db=db,
        recipient_id=current_superadmin.user_id,
        limit=limit,
        offset=offset,
    )
    unread_count = service.get_unread_count(db=db, recipient_id=current_superadmin.user_id)

    return NotificationListResponse(notifications=notifications, unread_count=unread_count)


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_superadmin: User = Depends(get_current_superadmin),
):
    """
    Lightweight endpoint for the notification bell badge - meant to be
    polled on an interval without pulling the full notification list.
    """
    count = service.get_unread_count(db=db, recipient_id=current_superadmin.user_id)
    return UnreadCountResponse(unread_count=count)


@router.patch("/{notification_id}/read", response_model=MarkReadResponse)
def mark_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_superadmin: User = Depends(get_current_superadmin),
):
    """
    Marks a single stored notification as read. Only works for real DB
    rows - computed entries (invite_not_activated / invite_expired) have
    no persisted ID and can't be individually dismissed this way.
    """
    found = service.mark_notification_read(
        db=db,
        notification_id=notification_id,
        recipient_id=current_superadmin.user_id,
    )
    if not found:
        raise HTTPException(status_code=404, detail="Notification not found")

    unread_count = service.get_unread_count(db=db, recipient_id=current_superadmin.user_id)
    return MarkReadResponse(success=True, unread_count=unread_count)


@router.patch("/read-all", response_model=MarkReadResponse)
def mark_all_read(
    db: Session = Depends(get_db),
    current_superadmin: User = Depends(get_current_superadmin),
):
    """Marks every unread stored notification as read for this superadmin."""
    service.mark_all_notifications_read(db=db, recipient_id=current_superadmin.user_id)
    unread_count = service.get_unread_count(db=db, recipient_id=current_superadmin.user_id)
    return MarkReadResponse(success=True, unread_count=unread_count)