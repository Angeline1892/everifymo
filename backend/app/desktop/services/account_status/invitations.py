import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.account_invitation_tokens import AccountInvitationToken
from app.core.audit import write_audit_log, get_user_region_code
from app.desktop.services.admin_notifications import admin_notification_service as notification_service
from app.desktop.schemas.admin_notifications.notification_enums import NotificationEventType
from .guards import assert_same_agency_and_region, get_target, action_for_role


def resend_invite_link(db: Session, actor, target_id, request=None):
    target = get_target(db, target_id)
    assert_same_agency_and_region(db, actor, target)

    old_token = (
        db.query(AccountInvitationToken)
        .filter(AccountInvitationToken.user_id == target.user_id, AccountInvitationToken.used_at.is_(None))
        .order_by(AccountInvitationToken.created_at.desc()).first()
    )
    if not old_token:
        raise HTTPException(status_code=404, detail="No pending invitation found for this account.")
    if old_token.expires_at > datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This invitation has not expired yet.")

    new_token = AccountInvitationToken(
        user_id=target.user_id, invite_token=secrets.token_urlsafe(32),
        expires_at=datetime.now(timezone.utc) + timedelta(days=2),
    )
    db.add(new_token)
    db.commit()

    target_id_val, target_email, target_role = target.user_id, target.email, target.role
    region_code = get_user_region_code(db, target) if target.region_id else None

    notification_service.notify_account_event(
        db=db, actor=actor, target_user_id=target_id_val,
        target_role=target_role, target_region_id=target.region_id,
        event_type=NotificationEventType.RESEND_LINK_REQUESTED,
        title="Invitation resent",
        message=f"Invitation resent to {target_email}.",
    )
    write_audit_log(
        db, user=actor, action=action_for_role(target_role, "INVITE_RESENT"),
        target_table="users", target_id=target_id_val, target_reference=target_email,
        old_value={"status": "invited"}, new_value={"status": "resend requested"},
        request=request, region_code=region_code,
    )
    return target_id_val, target_email, target_role, new_token.invite_token


def delete_invited_account(db: Session, actor, target_id, request=None):
    target = get_target(db, target_id)
    assert_same_agency_and_region(db, actor, target)
    if target.status != "invited":
        raise HTTPException(status_code=400, detail="Only pending invitations can be deleted this way.")

    token = (
        db.query(AccountInvitationToken)
        .filter(AccountInvitationToken.user_id == target.user_id, AccountInvitationToken.used_at.is_(None))
        .order_by(AccountInvitationToken.created_at.desc()).first()
    )
    if not token or token.expires_at > datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This invitation has not expired yet.")
    if token.resend_requested_at is not None:
        raise HTTPException(status_code=400, detail="A resend was requested for this invitation; use Resend Link instead.")

    target_id_val, target_email, target_role = target.user_id, target.email, target.role
    region_code = get_user_region_code(db, target) if target.region_id else None

    notification_service.notify_account_event(
        db=db, actor=actor, target_user_id=target_id_val,
        target_role=target_role, target_region_id=target.region_id,
        event_type=NotificationEventType.ACCOUNT_DELETED,
        title="Account deleted",
        message=f"{target_email}'s account has been deleted.",
    )

    db.query(AccountInvitationToken).filter(AccountInvitationToken.user_id == target.user_id).delete()
    db.delete(target)
    db.commit()

    write_audit_log(
        db, user=actor, action=action_for_role(target_role, "DELETE"),
        target_table="users", target_id=target_id_val, target_reference=target_email,
        old_value={"status": "invited"}, new_value={"status": "deleted"},
        request=request, region_code=region_code,
    )
    return target_id_val