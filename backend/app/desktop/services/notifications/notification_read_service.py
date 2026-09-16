from uuid import UUID
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.notifications import Notification
from app.desktop.services.notifications.sla_reminder_service import check_and_send_sla_reminders


def _unread_count(db: Session, user_id: UUID) -> int:
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read.is_(False),
    ).count()


def list_notifications(db: Session, current_user, limit: int, offset: int):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.user_id)
        .order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return notifications, _unread_count(db, current_user.user_id)


def get_unread_count(db: Session, current_user) -> int:
    check_and_send_sla_reminders(db, current_user)  # ADDED — piggybacks SLA check on this poll
    return _unread_count(db, current_user.user_id)


def mark_notification_read(db: Session, notification_id: UUID, current_user):
    notification = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        # Ownership check — same "vague 404" pattern used everywhere
        # else in this project: an officer can't tell the difference
        # between "doesn't exist" and "belongs to someone else."
        Notification.user_id == current_user.user_id,
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)

    return notification, _unread_count(db, current_user.user_id)


def mark_all_read(db: Session, current_user) -> int:
    now = datetime.now(timezone.utc)
    db.query(Notification).filter(
        Notification.user_id == current_user.user_id,
        Notification.is_read.is_(False),
    ).update({"is_read": True, "read_at": now}, synchronize_session=False)
    db.commit()
    return 0  # everything just got marked read, so unread_count is always 0 here