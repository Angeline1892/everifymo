# backend/app/desktop/routers/user_management/management.py
import uuid
import secrets
import secrets as secrets_module 
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.sessions import get_db
from app.models.users import User
from app.models.regions import Region
from app.models.account_invitation_tokens import AccountInvitationToken
from app.desktop.schemas.user_management.management import UserListItem, UserSummary
from app.core.constants import UserStatus, AuditAction
from app.core.dependencies import get_current_superadmin
from app.core.security import hash_password
from app.desktop.services.auth.email import send_activation_email
from app.desktop.services.superadmin_notifications import superadmin_notification_service as notification_service
from app.desktop.schemas.superadmin_notifications.notification_enums import NotificationEventType
from app.core.audit import write_audit_log, get_user_region_code

router = APIRouter(prefix="/admin/users", tags=["user-management"])

AGENCY_LABELS = {
    "fda_personnel": "FDA",
    "lea_personnel": "LEA-CIDG",
}


def compute_display_status(user: User, latest_token) -> str:
    if user.status == UserStatus.ACTIVE:
        if not user.is_active:
            return "Suspended"
        if user.is_locked:
            return "Locked"
        return "Active"

    if user.status == UserStatus.INVITED:
        if not latest_token:
            return "Invited"

        expires_at = latest_token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        token_expired = expires_at < datetime.now(timezone.utc)

        if not token_expired:
            return "Invited"
        if latest_token.resend_requested_at is not None:
            return "Resend Requested"
        return "Link Expired"

    if user.status == UserStatus.PENDING_APPROVAL:
        return "Pending Approval"

    return user.status


@router.get("", response_model=list[UserListItem])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))

    users = db.query(User).filter(User.role != "superadmin").all()
    if not users:
        return []

    user_ids = [user.user_id for user in users]
    tokens = (
        db.query(AccountInvitationToken)
        .filter(AccountInvitationToken.user_id.in_(user_ids))
        .order_by(AccountInvitationToken.created_at.asc())
        .all()
    )
    tokens_map = {token.user_id: token for token in tokens}

    region_ids = [u.region_id for u in users if u.region_id]
    regions = db.query(Region).filter(Region.region_id.in_(region_ids)).all() if region_ids else []
    regions_map = {r.region_id: r.region_name for r in regions}

    result = []
    for user in users:
        latest_token = tokens_map.get(user.user_id)

        parts = [p for p in [user.first_name, user.middle_name, user.last_name] if p]
        fullname = " ".join(parts) if parts else None

        result.append(
            UserListItem(
                user_id=user.user_id,
                fullname=fullname,
                first_name=user.first_name,
                last_name=user.last_name,
                employee_id=user.employee_id,
                email=user.email,
                agency=AGENCY_LABELS.get(user.role, user.role),
                region=regions_map.get(user.region_id),
                department=user.department,
                position=user.position,
                contact_number=user.contact_number,
                display_status=compute_display_status(user, latest_token),
                is_active=user.is_active,
                is_locked=user.is_locked,
            )
        )

    return result


@router.get("/summary", response_model=UserSummary)
def user_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))

    base_query = db.query(User).filter(User.role != "superadmin")

    total = base_query.count()
    active = base_query.filter(User.status == UserStatus.ACTIVE, User.is_active == True).count()
    pending_approval = base_query.filter(User.status == UserStatus.PENDING_APPROVAL).count()
    suspended = base_query.filter(User.status == UserStatus.ACTIVE, User.is_active == False).count()

    invited_users = base_query.filter(User.status == UserStatus.INVITED).all()
    invited_count = 0
    invite_requested_count = 0

    if invited_users:
        invited_ids = [u.user_id for u in invited_users]
        tokens = (
            db.query(AccountInvitationToken)
            .filter(AccountInvitationToken.user_id.in_(invited_ids))
            .order_by(AccountInvitationToken.created_at.asc())
            .all()
        )
        tokens_map = {token.user_id: token for token in tokens}
        for u in invited_users:
            latest_token = tokens_map.get(u.user_id)
            if latest_token and latest_token.resend_requested_at is not None:
                invite_requested_count += 1
            else:
                invited_count += 1

    return UserSummary(
        total_users=total,
        active=active,
        invited=invited_count,
        pending_approval=pending_approval,
        suspended=suspended,
        invite_requested=invite_requested_count,
    )


def generate_temp_password() -> str:
    # readable, still random: e.g. "Xk7-Rp2-Qw9!"
    return secrets_module.token_urlsafe(9) + "!A1"


@router.post("/{user_id}/activate")
async def activate_user(
    user_id: uuid.UUID,
    http_request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    previous_status = user.status

    temp_password = generate_temp_password()
    user.password_hash = hash_password(temp_password)
    user.force_password_change = True
    user.status = UserStatus.ACTIVE
    user.is_active = True

    fullname = " ".join(p for p in [user.first_name, user.middle_name, user.last_name] if p)
    user_email = user.email
    user_id_val = user.user_id
    region_code = get_user_region_code(db, user)

    db.commit()

    background_tasks.add_task(send_activation_email, user_email, fullname or user_email, temp_password)

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.ACCOUNT_ACTIVATED,
        title="Account activated",
        message=f"{user_email} has been activated and is now an active user.",
        related_user_id=user_id_val,
    )

    write_audit_log(
        db,
        user=current_user,
        action=AuditAction.APPROVE_PERSONNEL_ACCOUNT,
        target_table="users",
        target_id=user_id_val,
        target_reference=user_email,
        old_value={"status": previous_status},
        new_value={"status": "active"},
        request=http_request,
        region_code=region_code,
    )

    return {"message": "User account activated successfully"}


@router.post("/{user_id}/suspend")
def suspend_user(
    user_id: uuid.UUID,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False

    user_id_val = user.user_id
    user_email = user.email
    region_code = get_user_region_code(db, user)

    db.commit()

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.ACCOUNT_SUSPENDED,
        title="Account suspended",
        message=f"{user_email}'s account has been suspended.",
        related_user_id=user_id_val,
    )

    write_audit_log(
        db,
        user=current_user,
        action=AuditAction.SUSPEND_PERSONNEL_ACCOUNT,
        target_table="users",
        target_id=user_id_val,
        target_reference=user_email,
        old_value={"status": "active"},
        new_value={"status": "suspended"},
        request=http_request,
        region_code=region_code,
    )

    return {"message": "User account suspended successfully"}


@router.post("/{user_id}/reactivate")
def reactivate_user(
    user_id: uuid.UUID,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True

    user_id_val = user.user_id
    user_email = user.email
    region_code = get_user_region_code(db, user)

    db.commit()

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.ACCOUNT_REACTIVATED,
        title="Account reactivated",
        message=f"{user_email}'s account has been reactivated.",
        related_user_id=user_id_val,
    )

    write_audit_log(
        db,
        user=current_user,
        action=AuditAction.REACTIVATE_PERSONNEL_ACCOUNT,
        target_table="users",
        target_id=user_id_val,
        target_reference=user_email,
        old_value={"status": "suspended"},
        new_value={"status": "active"},
        request=http_request,
        region_code=region_code,
    )

    return {"message": "User account reactivated successfully"}


@router.post("/{user_id}/resend")
async def resend_invitation(
    user_id: uuid.UUID,
    http_request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.status != UserStatus.INVITED:
        raise HTTPException(status_code=400, detail="Cannot resend invite for a user who is not in invited status")

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=2)

    user_id_val = user.user_id
    user_email = user.email
    friendly_role = {
        "fda_personnel": "FDA",
        "lea_personnel": "LEA-CIDG"
    }.get(user.role, user.role)
    region_code = get_user_region_code(db, user)

    new_token = AccountInvitationToken(
        user_id=user_id_val,
        invite_token=token,
        expires_at=expires,
        resend_requested_at=None,
    )
    db.add(new_token)
    db.commit()

    from app.desktop.services.auth.email import send_invite_email
    background_tasks.add_task(send_invite_email, user_email, friendly_role, token)

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.RESEND_LINK_REQUESTED,
        title="Invitation resent",
        message=f"Invitation resent to {user_email}.",
        related_user_id=user_id_val,
    )

    write_audit_log(
        db,
        user=current_user,
        action=AuditAction.INVITE_PERSONNEL_RESENT,
        target_table="users",
        target_id=user_id_val,
        target_reference=user_email,
        old_value={"status": "invited"},
        new_value={"status": "resend requested"},
        request=http_request,
        region_code=region_code,
    )

    return {"message": "Invitation resent successfully"}


@router.delete("/{user_id}")
def delete_user(
    user_id: uuid.UUID,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.status != UserStatus.INVITED:
        raise HTTPException(status_code=400, detail="Only invited or expired invitations can be deleted.")


    deleted_user_id = user.user_id
    deleted_user_email = user.email
    deleted_user_region_code = get_user_region_code(db, user)

    
    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.ACCOUNT_DELETED,
        title="Account deleted",
        message=f"{deleted_user_email}'s account has been deleted.",
        related_user_id=deleted_user_id,
    )

    db.query(AccountInvitationToken).filter(AccountInvitationToken.user_id == user_id).delete()
    db.delete(user)
    db.commit()


    write_audit_log(
        db,
        user=current_user,
        action=AuditAction.DELETE_PERSONNEL_ACCOUNT,
        target_table="users",
        target_id=deleted_user_id,
        target_reference=deleted_user_email,
        old_value={"status": "invited"},
        new_value={"status": "deleted"},
        request=http_request,
        region_code=deleted_user_region_code,
    )

    return {"message": "User deleted successfully"}


@router.post("/{user_id}/unlock")
def unlock_user(
    user_id: uuid.UUID,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_locked = False
    user.failed_login_attempts = 0
    user.locked_until = None
    user.failed_otp_attempts = 0

    user_id_val = user.user_id
    user_email = user.email
    region_code = get_user_region_code(db, user)

    db.commit()

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.ACCOUNT_UNLOCKED,
        title="Account unlocked",
        message=f"{user_email}'s account has been unlocked.",
        related_user_id=user_id_val,
    )

    write_audit_log(
        db,
        user=current_user,
        action=AuditAction.UNLOCK_PERSONNEL_ACCOUNT,
        target_table="users",
        target_id=user_id_val,
        target_reference=user_email,
        old_value={"status": "locked"},
        new_value={"status": "active"},
        request=http_request,
        region_code=region_code,
    )

    return {"message": "User account unlocked successfully"}