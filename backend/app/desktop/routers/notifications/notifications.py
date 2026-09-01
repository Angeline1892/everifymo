from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.core.dependencies import get_current_user
from app.desktop.schemas.notifications.notifications import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
    MarkReadResponse,
    MarkAllReadResponse,
)
from app.desktop.services.notifications.notification_read_service import (
    list_notifications,
    get_unread_count,
    mark_notification_read,
    mark_all_read,
)

router = APIRouter(prefix="/personnel-notifications", tags=["Notifications"])


    # GET /notifications
@router.get("", response_model=NotificationListResponse)
def list_notifications_endpoint(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notifications, unread_count = list_notifications(db, current_user, limit, offset)
    return NotificationListResponse(
        notifications=[NotificationResponse.model_validate(n) for n in notifications],
        unread_count=unread_count,
    )


    # GET /notifications/unread-count
@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count_endpoint(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return UnreadCountResponse(unread_count=get_unread_count(db, current_user))


    # PATCH /notifications/{notification_id}/read
@router.patch("/{notification_id}/read", response_model=MarkReadResponse)
def mark_notification_read_endpoint(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notification, unread_count = mark_notification_read(db, notification_id, current_user)
    return MarkReadResponse(
        notification_id=notification.notification_id,
        is_read=notification.is_read,
        unread_count=unread_count,
    )


    # PATCH /notifications/read-all
@router.patch("/read-all", response_model=MarkAllReadResponse)
def mark_all_read_endpoint(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    unread_count = mark_all_read(db, current_user)
    return MarkAllReadResponse(unread_count=unread_count)