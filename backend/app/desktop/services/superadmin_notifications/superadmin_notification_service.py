import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.superadmin_notifications import SuperadminNotification
from app.models.users import User
from app.models.account_invitation_tokens import AccountInvitationToken
from app.desktop.schemas.superadmin_notifications.notification_enums import (
    NotificationEventType,
)
from app.desktop.schemas.superadmin_notifications.superadmin_notifications import (
    NotificationOut,
)

# How long an invited user can stay un-activated before superadmin gets
# nagged about it, WHILE the invite token is still valid. This must be
# shorter than the actual token expiry window (2 days, see
# create_invited_superadmin / create_invited_user), otherwise the token
# expires and moves into the invite_expired bucket before this ever fires.
# Set to 1 day: gives superadmin a heads-up with still ~1 day of runway
# left to nudge the user or resend, before it actually expires.
INVITE_STALE_AFTER_DAYS = 1

# Namespace used to generate a stable, deterministic UUID for computed
# (non-persisted) notifications, so the frontend still has a unique React
# key even though these rows don't exist in the database.
_SYNTHETIC_ID_NAMESPACE = uuid.UUID("12345678-1234-5678-1234-567812345678")


# ---------------------------------------------------------------------------
# 1. WRITE PATH - called from trigger points elsewhere in your codebase
# ---------------------------------------------------------------------------

def create_notification_for_all_superadmins(
    db: Session,
    event_type: NotificationEventType,
    title: str,
    message: str,
    related_user_id: Optional[uuid.UUID] = None,
) -> List[SuperadminNotification]:
    """
    Fan-out insert: creates one row per active superadmin.

    This is the ONE function every trigger point in your app should call
    (login handler, invite creation, suspend/reactivate, etc.) instead of
    inserting into superadmin_notifications directly. Keeping the insert
    logic in one place means if the fan-out logic ever changes, you only
    change it here.
    """
    superadmins = (
        db.query(User)
        .filter(User.role == "superadmin", User.is_active == True)  # noqa: E712
        .all()
    )

    new_rows = []
    for admin in superadmins:
        row = SuperadminNotification(
            recipient_id=admin.user_id,
            event_type=event_type.value,
            title=title,
            message=message,
            related_user_id=related_user_id,
        )
        db.add(row)
        new_rows.append(row)

    db.commit()
    for row in new_rows:
        db.refresh(row)

    return new_rows


# ---------------------------------------------------------------------------
# 2. COMPUTED ENTRIES - not stored, derived fresh on every read
# ---------------------------------------------------------------------------

def _synthetic_id(event_type: NotificationEventType, user_id: uuid.UUID) -> uuid.UUID:
    """Stable fake ID so the same computed notification doesn't change
    its React key between requests."""
    return uuid.uuid5(_SYNTHETIC_ID_NAMESPACE, f"{event_type.value}:{user_id}")


def _get_stale_invite_notifications(db: Session, recipient_id: uuid.UUID) -> List[NotificationOut]:
    """
    Users still at status='invited', past the staleness threshold, whose
    token HASN'T expired yet (still time to act, just haven't).
    Mutually exclusive with _get_expired_invite_notifications - once the
    token expires, it moves into that bucket instead of staying here.
    Recomputed on every call - nothing here is written to the DB.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=INVITE_STALE_AFTER_DAYS)
    now = datetime.now(timezone.utc)

    stale = (
        db.query(User, AccountInvitationToken)
        .join(AccountInvitationToken, AccountInvitationToken.user_id == User.user_id)
        .filter(
            User.status == "invited",
            User.created_at < cutoff,
            AccountInvitationToken.used_at.is_(None),
            AccountInvitationToken.expires_at > now,
        )
        .all()
    )

    return [
        NotificationOut(
            notification_id=_synthetic_id(NotificationEventType.INVITE_NOT_ACTIVATED, u.user_id),
            event_type=NotificationEventType.INVITE_NOT_ACTIVATED,
            title="Invitation not yet activated",
            message=f"{u.email} hasn't activated their invite after {INVITE_STALE_AFTER_DAYS} days.",
            related_user_id=u.user_id,
            is_read=False,
            read_at=None,
            created_at=u.created_at,
        )
        for u, token in stale
    ]


def _get_expired_invite_notifications(db: Session, recipient_id: uuid.UUID) -> List[NotificationOut]:
    """
    Users whose invitation token has expired and who never activated
    (used_at is still null). Recomputed on every call.
    """
    now = datetime.now(timezone.utc)

    expired = (
        db.query(User, AccountInvitationToken)
        .join(AccountInvitationToken, AccountInvitationToken.user_id == User.user_id)
        .filter(
            User.status == "invited",
            AccountInvitationToken.used_at.is_(None),
            AccountInvitationToken.expires_at <= now,
        )
        .all()
    )

    return [
        NotificationOut(
            notification_id=_synthetic_id(NotificationEventType.INVITE_EXPIRED, u.user_id),
            event_type=NotificationEventType.INVITE_EXPIRED,
            title="Invitation link expired",
            message=f"{u.email}'s invitation link expired before they activated their account.",
            related_user_id=u.user_id,
            is_read=False,
            read_at=None,
            created_at=token.expires_at,
        )
        for u, token in expired
    ]


# ---------------------------------------------------------------------------
# 3. READ PATH - used by the router endpoints
# ---------------------------------------------------------------------------

def get_notifications(
    db: Session,
    recipient_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
) -> List[NotificationOut]:
    """
    Returns stored notifications for this superadmin, merged with the
    computed (non-persisted) entries, sorted newest first.
    """
    stored = (
        db.query(SuperadminNotification)
        .filter(SuperadminNotification.recipient_id == recipient_id)
        .order_by(SuperadminNotification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    stored_out = [NotificationOut.model_validate(row) for row in stored]

    computed = []
    if offset == 0:
        computed = _get_stale_invite_notifications(db, recipient_id) + \
            _get_expired_invite_notifications(db, recipient_id)

    combined = stored_out + computed
    combined.sort(key=lambda n: n.created_at, reverse=True)
    return combined


def get_unread_count(db: Session, recipient_id: uuid.UUID) -> int:
    """
    Unread stored rows + computed entries (computed ones are always
    counted as unread since they can't be individually dismissed - they
    disappear on their own once the underlying condition resolves, e.g.
    the user finally activates their account).
    """
    stored_unread = (
        db.query(SuperadminNotification)
        .filter(
            SuperadminNotification.recipient_id == recipient_id,
            SuperadminNotification.is_read == False,  # noqa: E712
        )
        .count()
    )
    computed_count = len(_get_stale_invite_notifications(db, recipient_id)) + \
        len(_get_expired_invite_notifications(db, recipient_id))

    return stored_unread + computed_count


# ---------------------------------------------------------------------------
# 4. MARK-AS-READ - only applies to stored rows (computed entries have no
#    real ID to update, and shouldn't be "dismissable" anyway)
# ---------------------------------------------------------------------------

def mark_notification_read(db: Session, notification_id: uuid.UUID, recipient_id: uuid.UUID) -> bool:
    row = (
        db.query(SuperadminNotification)
        .filter(
            SuperadminNotification.notification_id == notification_id,
            SuperadminNotification.recipient_id == recipient_id,
        )
        .first()
    )
    if row is None:
        return False

    row.is_read = True
    row.read_at = datetime.now(timezone.utc)
    db.commit()
    return True


def mark_all_notifications_read(db: Session, recipient_id: uuid.UUID) -> int:
    rows = (
        db.query(SuperadminNotification)
        .filter(
            SuperadminNotification.recipient_id == recipient_id,
            SuperadminNotification.is_read == False,  # noqa: E712
        )
        .all()
    )
    now = datetime.now(timezone.utc)
    for row in rows:
        row.is_read = True
        row.read_at = now

    db.commit()
    return len(rows)