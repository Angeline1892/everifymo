# backend/app/desktop/services/auth/invite.py
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

from app.models.users import User
from app.models.account_invitation_tokens import AccountInvitationToken
from app.core.constants import Role
from app.core.audit import write_audit_log, get_user_region_code
from app.desktop.services.admin_notifications import admin_notification_service as notification_service
from app.desktop.schemas.admin_notifications.notification_enums import NotificationEventType
from app.desktop.services.account_status.guards import action_for_role, agency_of


def create_invited_account(
    db: Session,
    *,
    email: str,
    role: str,
    created_by,
    first_name: str,
    last_name: str,
    middle_name: str | None = None,
    contact_number: str | None = None,
    employee_id: str | None = None,
    position: str | None = None,
    department: str | None = None,
    region_id=None,
    request=None,
):
    """Single creator used by all four invitation paths:
    National Admin -> Admin, National Admin -> National Admin,
    Admin -> fellow Admin, Admin -> Personnel."""
    db.execute(text("SET app.bypass_rls = 'true'"))

    if role == Role.NATIONAL_ADMIN and region_id is not None:
        raise HTTPException(status_code=400, detail="National Admin accounts cannot have a region.")
    if role != Role.NATIONAL_ADMIN and region_id is None:
        raise HTTPException(status_code=400, detail="This role requires a region.")

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists.")
    if employee_id and db.query(User).filter(User.employee_id == employee_id).first():
        raise HTTPException(status_code=409, detail=f"Employee ID '{employee_id}' is already in use.")
    if contact_number and db.query(User).filter(User.contact_number == contact_number).first():
        raise HTTPException(status_code=409, detail=f"Contact number '{contact_number}' is already in use.")

    user = User(
        email=email,
        role=role,
        region_id=region_id,
        first_name=first_name,
        last_name=last_name,
        middle_name=middle_name,
        contact_number=contact_number,
        employee_id=employee_id,
        position=position,
        department=department,
        created_by=created_by,
        force_password_change=False,  # invitee sets their own password at registration
    )
    db.add(user)
    db.flush()

    # Capture what we need while the object is still fully populated,
    # before commit() expires its attributes.
    user_id = user.user_id
    user_email = user.email
    user_region_code = get_user_region_code(db, user) if region_id else None

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=2)
    db.add(AccountInvitationToken(user_id=user_id, invite_token=token, expires_at=expires))
    db.commit()
    # no db.refresh(user), no user.<anything> reads past this point

    inviting_admin = db.query(User).filter(User.user_id == created_by).first()

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.PERSONNEL_INVITED,
        title="New account invited",
        message=f"{user_email} was invited as {role.replace('_', ' ')}.",
        related_user_id=user_id,
    )

    write_audit_log(
        db,
        user=inviting_admin,
        action=_invite_action_for_role(role),
        target_table="users",
        target_id=user_id,
        target_reference=user_email,
        old_value=None,
        new_value={"email": user_email, "role": role, "status": "invited"},
        request=request,
        region_code=user_region_code,
    )

    return user_id, token


def activate_account(db: Session, target_id, activated_by, request=None):
    """Single activator used everywhere a pending_approval account gets
    approved — National Admin, Admin, and Personnel alike."""
    db.execute(text("SET app.bypass_rls = 'true'"))
    target = db.query(User).filter(User.user_id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Account not found.")
    if target.status != "pending_approval":
        raise HTTPException(status_code=400, detail="This account is not awaiting activation.")

    if activated_by.role != Role.NATIONAL_ADMIN:
        same_region = target.region_id == activated_by.region_id
        same_agency = agency_of(target.role) == agency_of(activated_by.role)
        if not (same_region and same_agency):
            raise HTTPException(status_code=403, detail="You can only activate accounts in your own agency and region.")

    target.status = "active"
    target.is_active = True

    target_id_val = target.user_id
    target_email = target.email
    region_code = get_user_region_code(db, target) if target.region_id else None

    db.commit()
    # no db.refresh(target)

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.ACCOUNT_ACTIVATED,
        title="Account activated",
        message=f"{target_email} has been activated and is now active.",
        related_user_id=target_id_val,
    )

    write_audit_log(
        db,
        user=activated_by,
        action=_activate_action_for_role(target.role),
        target_table="users",
        target_id=target_id_val,
        target_reference=target_email,
        old_value={"status": "pending_approval"},
        new_value={"status": "active"},
        request=request,
        region_code=region_code,
    )

    return target_id_val, target_email


def _invite_action_for_role(role: str) -> str:
    from app.core.constants import AuditAction
    if role == Role.NATIONAL_ADMIN:
        return AuditAction.INVITE_SUPERADMIN  # national_admin reuses SUPERADMIN_* — no new constant added
    if role in Role.ADMIN_ROLES:
        return AuditAction.INVITE_ADMIN
    return AuditAction.INVITE_PERSONNEL


def _activate_action_for_role(role: str) -> str:
    from app.core.constants import AuditAction
    if role == Role.NATIONAL_ADMIN:
        return AuditAction.APPROVE_SUPERADMIN_ACCOUNT  # same reuse as above
    if role in Role.ADMIN_ROLES:
        return AuditAction.APPROVE_ADMIN_ACCOUNT
    return AuditAction.APPROVE_PERSONNEL_ACCOUNT