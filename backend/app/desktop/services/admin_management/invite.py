# backend/app/desktop/services/admin_management/invite.py
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
from app.core.constants import UserStatus
from app.core.security import hash_password

from app.core.audit import write_audit_log, get_user_region_code
from app.core.constants import AuditAction

from app.models.users import User
from app.models.account_invitation_tokens import AccountInvitationToken
from app.desktop.services.superadmin_notifications import superadmin_notification_service as notification_service
from app.desktop.schemas.superadmin_notifications.notification_enums import NotificationEventType


def create_invited_superadmin(db: Session, email: str, first_name: str, last_name: str, created_by, request=None):
    db.execute(text("SET app.bypass_rls = 'true'"))

    user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        region_id=None,
        role="superadmin",
        created_by=created_by,
    )
    db.add(user)
    db.flush()

    # capture before commit expires the object
    user_id = user.user_id
    user_email = user.email

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=2)

    invite = AccountInvitationToken(
        user_id=user_id,
        invite_token=token,
        expires_at=expires,
    )
    db.add(invite)
    db.commit()
    # no db.refresh(user), no user.<attr> reads past this point

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.SUPERADMIN_INVITED,
        title="New superadmin invited",
        message=f"{user_email} was invited as a new superadmin.",
        related_user_id=user_id,
    )

    write_audit_log(
        db,
        user=None,
        action=AuditAction.INVITE_SUPERADMIN,
        target_table="users",
        target_id=user_id,
        target_reference=user_email,
        old_value=None,
        new_value={"email": user_email, "role": "superadmin", "status": "invited"},
        request=request,
        region_code=None,
        user_role_override="superadmin",
        user_id_override=created_by,
    )

    return user_id, token


def _resolve_token_status(invite: AccountInvitationToken) -> str:
    if invite.used_at is not None:
        return "used"
    expires_at = invite.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return "expired"
    return "valid"


def complete_superadmin_registration(db: Session, token: str, new_password: str, request=None):
    db.execute(text("SET app.bypass_rls = 'true'"))
    invite = (
        db.query(AccountInvitationToken)
        .filter(AccountInvitationToken.invite_token == token)
        .first()
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invitation link.")

    token_status = _resolve_token_status(invite)
    if token_status == "used":
        raise HTTPException(status_code=400, detail="This invitation has already been used.")
    if token_status == "expired":
        raise HTTPException(status_code=400, detail="This invitation has expired.")

    user = db.query(User).filter(User.user_id == invite.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Associated account not found.")

    user.password_hash = hash_password(new_password)
    user.status = UserStatus.PENDING_APPROVAL
    user.is_active = False
    user.force_password_change = False
    invite.used_at = datetime.now(timezone.utc)

    # capture before commit
    user_id = user.user_id
    user_email = user.email

    db.commit()
    # no db.refresh(user)

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.SUPERADMIN_PASSWORD_CREATED,
        title="Superadmin password created",
        message=f"{user_email} created their password and is now awaiting activation.",
        related_user_id=user_id,
    )

    write_audit_log(
        db,
        user=None,
        action=AuditAction.SUPERADMIN_PENDING_APPROVAL,
        target_table="users",
        target_id=user_id,
        target_reference=user_email,
        request=request,
        region_code=None,
        user_role_override="superadmin",
        user_id_override=user_id,
    )

    return user_id


def activate_superadmin(db: Session, admin_id, activated_by=None, request=None):
    db.execute(text("SET app.bypass_rls = 'true'"))
    admin = db.query(User).filter(
        User.user_id == admin_id, User.role == "superadmin"
    ).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Superadmin not found.")
    if admin.status != UserStatus.PENDING_APPROVAL:
        raise HTTPException(status_code=400, detail="This account is not awaiting activation.")

    admin.status = UserStatus.ACTIVE
    admin.is_active = True

    # capture everything BEFORE commit, including the acting admin's id —
    # commit() expires every object in the session, not just this one
    admin_id_val = admin.user_id
    admin_email = admin.email
    activated_by_id = activated_by.user_id if activated_by else None

    db.commit()
    # no db.refresh(admin)

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.ACCOUNT_ACTIVATED,
        title="Account activated",
        message=f"{admin_email} has been activated and is now a full superadmin.",
        related_user_id=admin_id_val,
    )

    write_audit_log(
        db,
        user=None,
        action=AuditAction.APPROVE_SUPERADMIN_ACCOUNT,
        target_table="users",
        target_id=admin_id_val,
        target_reference=admin_email,
        old_value={"status": "pending_approval"},
        new_value={"status": "active"},
        request=request,
        region_code=None,
        user_role_override="superadmin",
        user_id_override=activated_by_id,
    )

    return admin_id_val, admin_email