# backend/app/desktop/services/admin_notifications/admin_notification_service.py
"""
Fan-out + read logic for admin_notifications.

Two write-path functions cover every trigger point in the system:
- notify_national_admin_workspace: for anything that happens INSIDE the
  National Admin workspace (adding a peer national admin, or
  bootstrapping the very first admin for a brand-new region).
- notify_regional_admin_workspace: for anything that happens INSIDE a
  regional admin's own workspace (FDA or LEA) - adding a co-admin, or
  any personnel-account action.

Notifications never cross workspaces. A National Admin action only
reaches other national_admin accounts; a Regional Admin action only
reaches co-admins already active in that same region+agency. See
notification_enums.py for the full event-type list.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.admin_notifications import AdminNotification
from app.models.notifications import Notification  # personnel-facing table - dual-write target
from app.models.users import User
from app.models.account_invitation_tokens import AccountInvitationToken
from app.core.constants import Role
from app.desktop.schemas.admin_notifications.notification_enums import (
    NotificationEventType,
)
from app.desktop.schemas.admin_notifications.admin_notifications import (
    NotificationOut,
)

# How long an invited admin can stay un-activated before their workspace
# gets nagged about it, WHILE the invite token is still valid. Must be
# shorter than the token expiry window (2 days) or the token expires and
# moves into the invite_expired bucket before this ever fires.
INVITE_STALE_AFTER_DAYS = 1

# Namespace for a stable, deterministic UUID on computed (non-persisted)
# notifications, so the frontend still gets a consistent React key even
# though these rows don't exist in the database.
_SYNTHETIC_ID_NAMESPACE = uuid.UUID("12345678-1234-5678-1234-567812345678")


# ---------------------------------------------------------------------------
# 1. WRITE PATH - the two fan-out functions every trigger point calls
# ---------------------------------------------------------------------------

def notify_national_admin_workspace(
    db: Session,
    event_type: NotificationEventType,
    title: str,
    message: str,
    related_user_id: Optional[uuid.UUID] = None,
    agency: Optional[str] = None,
    region_id: Optional[uuid.UUID] = None,
) -> List[AdminNotification]:
    """
    Fan-out insert: one row per active national_admin.

    agency/region_id here are DISPLAY CONTEXT only (e.g. "new FDA admin
    added for Region III") - they do NOT filter who receives the row.
    Every active national_admin gets it, since this function is only
    ever called for actions taken inside the National Admin workspace.
    """
    recipients = (
        db.query(User)
        .filter(User.role == Role.NATIONAL_ADMIN, User.is_active == True)  # noqa: E712
        .all()
    )

    new_rows = []
    for admin in recipients:
        row = AdminNotification(
            recipient_id=admin.user_id,
            event_type=event_type.value,
            title=title,
            message=message,
            related_user_id=related_user_id,
            agency=agency,
            region_id=region_id,
        )
        db.add(row)
        new_rows.append(row)

    db.commit()
    for row in new_rows:
        db.refresh(row)

    return new_rows


def notify_regional_admin_workspace(
    db: Session,
    agency_admin_role: str,
    region_id: uuid.UUID,
    agency: str,
    event_type: NotificationEventType,
    title: str,
    message: str,
    related_user_id: Optional[uuid.UUID] = None,
) -> List[AdminNotification]:
    """
    Fan-out insert: one row per active co-admin sharing the SAME admin
    role (Role.FDA_ADMIN or Role.LEA_ADMIN) and the SAME region_id.

    Covers both regional admin-account events (adding/managing a
    co-admin) AND personnel-account events (add/suspend/etc a personnel
    account) - both want the identical audience: every co-admin already
    active in that one region, for that one agency. National Admin is
    never included here.
    """
    recipients = (
        db.query(User)
        .filter(
            User.role == agency_admin_role,
            User.region_id == region_id,
            User.is_active == True,  # noqa: E712
        )
        .all()
    )

    new_rows = []
    for admin in recipients:
        row = AdminNotification(
            recipient_id=admin.user_id,
            event_type=event_type.value,
            title=title,
            message=message,
            related_user_id=related_user_id,
            agency=agency,
            region_id=region_id,
        )
        db.add(row)
        new_rows.append(row)

    db.commit()
    for row in new_rows:
        db.refresh(row)

    return new_rows


def notify_personnel_profile_updated(
    db: Session,
    personnel: User,
    agency_admin_role: str,
    agency: str,
    title: str,
    admin_workspace_message: str,
    personnel_message: str,
) -> None:
    """
    DUAL-WRITE for ACCOUNT_INFO_UPDATED on a personnel account:

    1. Fans out to the personnel's own region+agency admin workspace,
       same as any other personnel event.
    2. ALSO writes ONE separately-worded row directly to that specific
       personnel's own notifications table (recipient_type='personnel')
       - not a broadcast to other personnel in the region, just this
       one account, so THEY know their profile was changed.
    """
    notify_regional_admin_workspace(
        db=db,
        agency_admin_role=agency_admin_role,
        region_id=personnel.region_id,
        agency=agency,
        event_type=NotificationEventType.ACCOUNT_INFO_UPDATED,
        title=title,
        message=admin_workspace_message,
        related_user_id=personnel.user_id,
    )

    db.add(Notification(
        recipient_type="personnel",
        user_id=personnel.user_id,
        title=title,
        message=personnel_message,
    ))
    db.commit()


# ---------------------------------------------------------------------------
# 2. COMPUTED ENTRIES - not stored, derived fresh on every read
# ---------------------------------------------------------------------------

def _synthetic_id(event_type: NotificationEventType, user_id: uuid.UUID) -> uuid.UUID:
    """Stable fake ID so the same computed notification doesn't change
    its React key between requests."""
    return uuid.uuid5(_SYNTHETIC_ID_NAMESPACE, f"{event_type.value}:{user_id}")


def _get_stale_invite_notifications(db: Session, recipient: User) -> List[NotificationOut]:
    """
    Admin accounts still at status='invited', past the staleness
    threshold, whose token HASN'T expired yet. Mutually exclusive with
    _get_expired_invite_notifications.

    SCOPED TO THE RECIPIENT'S OWN WORKSPACE - this was a real gap in the
    old flat-superadmin version, which queried every invited user with
    no filter at all:
    - national_admin sees stale invites for ANY admin account (any
      agency/region), since national_admin has no region of its own.
    - fda_admin/lea_admin sees ONLY stale invites for co-admins sharing
      their own role + region. Personnel never appear here at all -
      they don't go through this invite flow anymore.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=INVITE_STALE_AFTER_DAYS)
    now = datetime.now(timezone.utc)

    query = (
        db.query(User, AccountInvitationToken)
        .join(AccountInvitationToken, AccountInvitationToken.user_id == User.user_id)
        .filter(
            User.status == "invited",
            User.created_at < cutoff,
            AccountInvitationToken.used_at.is_(None),
            AccountInvitationToken.expires_at > now,
        )
    )

    if recipient.role == Role.NATIONAL_ADMIN:
        query = query.filter(User.role.in_(Role.ADMIN_ROLES | {Role.NATIONAL_ADMIN}))
    else:
        query = query.filter(
            User.role == recipient.role,
            User.region_id == recipient.region_id,
        )

    stale = query.all()

    return [
        NotificationOut(
            notification_id=_synthetic_id(NotificationEventType.INVITE_NOT_ACTIVATED, u.user_id),
            event_type=NotificationEventType.INVITE_NOT_ACTIVATED,
            title="Invitation not yet activated",
            message=f"{u.email} hasn't activated their invite after {INVITE_STALE_AFTER_DAYS} day(s).",
            related_user_id=u.user_id,
            agency=None,
            region_id=u.region_id,
            is_read=False,
            read_at=None,
            created_at=u.created_at,
        )
        for u, token in stale
    ]


def _get_expired_invite_notifications(db: Session, recipient: User) -> List[NotificationOut]:
    """Same scoping rule as _get_stale_invite_notifications, but for
    admin accounts whose invite token fully expired unused."""
    now = datetime.now(timezone.utc)

    query = (
        db.query(User, AccountInvitationToken)
        .join(AccountInvitationToken, AccountInvitationToken.user_id == User.user_id)
        .filter(
            User.status == "invited",
            AccountInvitationToken.used_at.is_(None),
            AccountInvitationToken.expires_at <= now,
        )
    )

    if recipient.role == Role.NATIONAL_ADMIN:
        query = query.filter(User.role.in_(Role.ADMIN_ROLES | {Role.NATIONAL_ADMIN}))
    else:
        query = query.filter(
            User.role == recipient.role,
            User.region_id == recipient.region_id,
        )

    expired = query.all()

    return [
        NotificationOut(
            notification_id=_synthetic_id(NotificationEventType.INVITE_EXPIRED, u.user_id),
            event_type=NotificationEventType.INVITE_EXPIRED,
            title="Invitation link expired",
            message=f"{u.email}'s invitation link expired before they activated their account.",
            related_user_id=u.user_id,
            agency=None,
            region_id=u.region_id,
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
    current_admin: User,
    limit: int = 20,
    offset: int = 0,
) -> List[NotificationOut]:
    """
    Stored notifications for this admin, merged with computed entries,
    newest first. No extra scoping needed beyond filtering by
    recipient_id - the WRITE path only ever inserts a row for an admin
    who was a valid recipient, so every stored row here is already
    correctly scoped.
    """
    stored = (
        db.query(AdminNotification)
        .filter(AdminNotification.recipient_id == current_admin.user_id)
        .order_by(AdminNotification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    stored_out = [NotificationOut.model_validate(row) for row in stored]

    computed = []
    if offset == 0:
        computed = _get_stale_invite_notifications(db, current_admin) + \
            _get_expired_invite_notifications(db, current_admin)

    combined = stored_out + computed
    combined.sort(key=lambda n: n.created_at, reverse=True)
    return combined


def get_unread_count(db: Session, current_admin: User) -> int:
    """Unread stored rows + computed entries (computed ones always count
    as unread - they can't be dismissed, they just disappear once the
    underlying invite finally gets activated)."""
    stored_unread = (
        db.query(AdminNotification)
        .filter(
            AdminNotification.recipient_id == current_admin.user_id,
            AdminNotification.is_read == False,  # noqa: E712
        )
        .count()
    )
    computed_count = len(_get_stale_invite_notifications(db, current_admin)) + \
        len(_get_expired_invite_notifications(db, current_admin))

    return stored_unread + computed_count


# ---------------------------------------------------------------------------
# 4. MARK-AS-READ - stored rows only (computed entries have no real ID)
# ---------------------------------------------------------------------------

def mark_notification_read(db: Session, notification_id: uuid.UUID, recipient_id: uuid.UUID) -> bool:
    row = (
        db.query(AdminNotification)
        .filter(
            AdminNotification.notification_id == notification_id,
            AdminNotification.recipient_id == recipient_id,
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
        db.query(AdminNotification)
        .filter(
            AdminNotification.recipient_id == recipient_id,
            AdminNotification.is_read == False,  # noqa: E712
        )
        .all()
    )
    now = datetime.now(timezone.utc)
    for row in rows:
        row.is_read = True
        row.read_at = now

    db.commit()
    return len(rows)