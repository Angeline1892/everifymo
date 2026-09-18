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
from app.desktop.services.account_status.guards import agency_of
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


# ADDED: which admin-account lifecycle events on a regional peer also
# need to reach National Admin, on top of the regional-peer notification.
# Invite/resend/unlock/delete stay regional-only by design.
NATIONAL_ADMIN_ALSO_NOTIFIED = {
    NotificationEventType.ACCOUNT_ACTIVATED,
    NotificationEventType.ACCOUNT_SUSPENDED,
    NotificationEventType.ACCOUNT_REACTIVATED,
}


def notify_account_event(
    db: Session,
    actor: User,
    target_user_id,
    target_role: str,
    target_region_id,
    event_type: NotificationEventType,
    title: str,
    message: str,
) -> None:
    """
    ONE routing function for every shared account_status call site
    (invite, activate, suspend, reactivate, unlock, resend, delete) -
    these are shared across admin AND personnel targets, so the right
    workspace has to be picked per-call rather than hardcoded.

    Routing rule - notifications stay inside the ACTOR's own workspace:
    - target is personnel -> always the actor's own regional workspace
      (only Admins manage Personnel, so actor is always fda_admin/lea_admin
      here - never national_admin).
    - target is national_admin/fda_admin/lea_admin -> National Admin
      workspace if the actor IS national_admin, otherwise the actor's own
      regional workspace (they're managing a co-admin in their region).

    Scope change: when a regional admin activates, suspends, or
    reactivates a co-admin in their own region, National Admin is now
    ALSO notified in addition to the regional-peer notification (see
    NATIONAL_ADMIN_ALSO_NOTIFIED). Invite/resend/unlock/delete stay
    regional-only.
    """
    if target_role in Role.PERSONNEL_ROLES:
        notify_regional_admin_workspace(
            db=db, agency_admin_role=actor.role, region_id=target_region_id,
            agency=agency_of(actor.role), event_type=event_type,
            title=title, message=message, related_user_id=target_user_id,
        )
    elif actor.role == Role.NATIONAL_ADMIN:
        notify_national_admin_workspace(
            db=db, event_type=event_type, title=title, message=message,
            related_user_id=target_user_id,
            agency=agency_of(target_role),  # None if target is national_admin
            region_id=target_region_id,
        )
    else:
        notify_regional_admin_workspace(
            db=db, agency_admin_role=actor.role, region_id=actor.region_id,
            agency=agency_of(actor.role), event_type=event_type,
            title=title, message=message, related_user_id=target_user_id,
        )
        # CHANGED: was ACCOUNT_ACTIVATED-only; widened to also cover
        # suspend/reactivate on a co-admin.
        if event_type in NATIONAL_ADMIN_ALSO_NOTIFIED and target_role in Role.ADMIN_ROLES:
            notify_national_admin_workspace(
                db=db, event_type=event_type, title=title, message=message,
                related_user_id=target_user_id,
                agency=agency_of(target_role),
                region_id=target_region_id,
            )


def notify_self_service_account_event(
    db: Session,
    target: User,
    event_type: NotificationEventType,
    title: str,
    message: str,
) -> None:
    """
    For events with NO acting admin - the account holder triggered this
    on themselves (completing registration, requesting a resend from the
    public invite-expired page, before they even have a session).

    Routes by who CAN ACT on this account next, not who performed the
    action:
    - personnel target -> their own region+agency admin workspace only
      (personnel skip pending_approval entirely, so this is really just
      "here's an update on an account you manage").
    - fda_admin/lea_admin target -> national_admin (can always activate
      them, per activate_account's permission check) PLUS peer co-admins
      sharing that same role+region (can also activate them).
    - national_admin target -> national_admin peers only.
    """
    if target.role in Role.PERSONNEL_ROLES:
        agency_admin_role = Role.FDA_ADMIN if target.role == Role.FDA_PERSONNEL else Role.LEA_ADMIN
        notify_regional_admin_workspace(
            db=db, agency_admin_role=agency_admin_role, region_id=target.region_id,
            agency=agency_of(target.role), event_type=event_type,
            title=title, message=message, related_user_id=target.user_id,
        )
        return

    notify_national_admin_workspace(
        db=db, event_type=event_type, title=title, message=message,
        related_user_id=target.user_id,
        agency=agency_of(target.role),  # None if target is national_admin
        region_id=target.region_id,
    )
    if target.role in Role.ADMIN_ROLES:  # fda_admin/lea_admin also have region peers who can act
        notify_regional_admin_workspace(
            db=db, agency_admin_role=target.role, region_id=target.region_id,
            agency=agency_of(target.role), event_type=event_type,
            title=title, message=message, related_user_id=target.user_id,
        )


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
    Admin AND personnel accounts still at status='invited', past the
    staleness threshold, token not yet expired.

    SCOPED TO THE RECIPIENT'S OWN WORKSPACE:
    - national_admin sees stale invites for any admin-tier account
      (national_admin/fda_admin/lea_admin), any region - never personnel.
    - fda_admin/lea_admin sees stale invites for BOTH their own co-admin
      role AND the personnel role under their own agency, filtered to
      their own region_id.
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
        personnel_role = Role.FDA_PERSONNEL if recipient.role == Role.FDA_ADMIN else Role.LEA_PERSONNEL
        query = query.filter(
            User.role.in_({recipient.role, personnel_role}),
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
    """Same scoping fix as _get_stale_invite_notifications, for invites
    whose token fully expired unused."""
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
        personnel_role = Role.FDA_PERSONNEL if recipient.role == Role.FDA_ADMIN else Role.LEA_PERSONNEL
        query = query.filter(
            User.role.in_({recipient.role, personnel_role}),
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
) -> tuple[List[NotificationOut], bool]:
    """
    Stored notifications for this admin, merged with computed entries,
    newest first.

    # CHANGED: now returns (notifications, has_more) instead of a bare
    # list. has_more is determined by fetching one extra STORED row
    # (limit + 1) and checking whether it came back - if so, there's
    # another page, and we drop that extra row before returning.
    # Computed entries (stale/expired invites) are excluded from this
    # check entirely - they only ever appear on page 1 and were never
    # part of the stored table's offset space to begin with, which was
    # the root cause of the original bug.
    """
    stored = (
        db.query(AdminNotification)
        .filter(AdminNotification.recipient_id == current_admin.user_id)
        .order_by(AdminNotification.created_at.desc())
        .offset(offset)
        .limit(limit + 1)
        .all()
    )
    has_more = len(stored) > limit
    stored = stored[:limit]
    stored_out = [NotificationOut.model_validate(row) for row in stored]

    computed = []
    if offset == 0:
        computed = _get_stale_invite_notifications(db, current_admin) + \
            _get_expired_invite_notifications(db, current_admin)

    combined = stored_out + computed
    combined.sort(key=lambda n: n.created_at, reverse=True)
    return combined, has_more


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