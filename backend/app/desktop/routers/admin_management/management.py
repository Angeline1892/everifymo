# backend/app/desktop/routers/admin_management/management.py        
import uuid
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.audit import write_audit_log, get_user_region_code
from app.core.constants import AuditAction

from app.database.sessions import get_db
from app.models.users import User
from app.models.user_sessions import UserSession
from app.models.account_invitation_tokens import AccountInvitationToken
from app.desktop.schemas.admin_management.management import (
    SuperadminListItem,
    SuperadminSummary,
    InviteSuperadminRequest,
)
from app.core.constants import UserStatus
from app.core.dependencies import get_current_superadmin
from app.desktop.services.auth.email import send_invite_email
from app.desktop.services.auth.email import send_superadmin_invite_email
from app.desktop.services.admin_management.invite import create_invited_superadmin
from app.desktop.services.admin_management.invite import activate_superadmin
from app.desktop.services.auth.email import send_superadmin_activation_email
from app.desktop.services.superadmin_notifications import superadmin_notification_service as notification_service
from app.desktop.schemas.superadmin_notifications.notification_enums import NotificationEventType


router = APIRouter(prefix="/admin/superadmins", tags=["superadmin-management"])


def compute_admin_status(user: User, latest_token) -> str:
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


@router.get("", response_model=list[SuperadminListItem])
def list_superadmins(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))

    admins = db.query(User).filter(User.role == "superadmin").all()
    if not admins:
        return []

    admin_ids = [a.user_id for a in admins]
    tokens = (
        db.query(AccountInvitationToken)
        .filter(AccountInvitationToken.user_id.in_(admin_ids))
        .order_by(AccountInvitationToken.created_at.asc())
        .all()
    )
    tokens_map = {t.user_id: t for t in tokens}

    result = []
    for admin in admins:
        latest_token = tokens_map.get(admin.user_id)
        result.append(
            SuperadminListItem(
                admin_id=admin.user_id,
                first_name=admin.first_name,
                last_name=admin.last_name,
                email=admin.email,
                invitation_date=latest_token.created_at if latest_token else None,
                expiration_date=latest_token.expires_at if latest_token else None,
                status=compute_admin_status(admin, latest_token),
                is_locked=admin.is_locked,
            )
        )
    return result


@router.get("/summary", response_model=SuperadminSummary)
def superadmin_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    base = db.query(User).filter(User.role == "superadmin")

    total = base.count()
    active = base.filter(User.status == UserStatus.ACTIVE, User.is_active == True).count()
    suspended = base.filter(User.status == UserStatus.ACTIVE, User.is_active == False).count()

    invited_admins = base.filter(User.status == UserStatus.INVITED).all()
    invited_count = 0
    expired_count = 0
    if invited_admins:
        ids = [a.user_id for a in invited_admins]
        tokens = (
            db.query(AccountInvitationToken)
            .filter(AccountInvitationToken.user_id.in_(ids))
            .order_by(AccountInvitationToken.created_at.asc())
            .all()
        )
        tokens_map = {t.user_id: t for t in tokens}
        for a in invited_admins:
            status = compute_admin_status(a, tokens_map.get(a.user_id))
            if status == "Link Expired":
                expired_count += 1
            else:
                invited_count += 1

    return SuperadminSummary(
        total_admins=total,
        active=active,
        invited=invited_count,
        invitation_expired=expired_count,
        suspended=suspended,
    )


@router.post("/invite", status_code=201)
async def invite_superadmin(
    payload: InviteSuperadminRequest,
    http_request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    existing = db.query(User).filter_by(email=payload.email).first()
    if existing:
        raise HTTPException(400, "A user with this email already exists.")

    admin_id, token = create_invited_superadmin(
        db,
        payload.email,
        payload.first_name,
        payload.last_name,
        created_by=current_user.user_id,
        request=http_request,
    )

    background_tasks.add_task(send_superadmin_invite_email, payload.email, token)

    return {"message": "Superadmin invitation sent", "admin_id": str(admin_id)}


@router.post("/{admin_id}/resend")
async def resend_superadmin_invitation(
    admin_id: uuid.UUID,
    http_request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    admin = db.query(User).filter(User.user_id == admin_id, User.role == "superadmin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Superadmin not found")
    if admin.status != UserStatus.INVITED:
        raise HTTPException(status_code=400, detail="Cannot resend invite for an admin who is not in invited status")

    admin_email = admin.email
    admin_id_val = admin.user_id

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=2)

    new_token = AccountInvitationToken(
        user_id=admin_id_val,
        invite_token=token,
        expires_at=expires,
        resend_requested_at=None,
    )
    db.add(new_token)
    db.commit()

    background_tasks.add_task(send_superadmin_invite_email, admin_email, token)

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.RESEND_LINK_REQUESTED,
        title="Invitation resent",
        message=f"Invitation resent to {admin_email}.",
        related_user_id=admin_id_val,
    )

    write_audit_log(
        db,
        user=current_user,
        action=AuditAction.INVITE_SUPERADMIN_RESENT,
        target_table="users",
        target_id=admin_id_val,
        target_reference=admin_email,
        old_value={"status": "invited"},
        new_value={"status": "resend requested"},
        request=http_request,
        region_code=None,
        user_role_override="superadmin",
    )

    return {"message": "Invitation resent successfully"}


@router.post("/{admin_id}/suspend")
def suspend_superadmin(
    admin_id: uuid.UUID,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    if admin_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="You cannot suspend your own account.")

    db.execute(text("SET app.bypass_rls = 'true'"))
    admin = db.query(User).filter(User.user_id == admin_id, User.role == "superadmin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Superadmin not found")

    # Ashanti code starts here
    # Atomic check-and-write: the WHERE clause's subquery and the SET happen
    # as one indivisible DB operation, so two concurrent suspend requests
    # (e.g. A suspending B and B suspending A at the same instant) can't both
    # read "safe" before either write lands. Same pattern as the SLA reminder
    # service's atomic claim UPDATE. If the subquery finds zero OTHER active,
    # unlocked, ACTIVE-status superadmins at the moment this statement
    # actually runs, the UPDATE matches no rows and RETURNING gives back
    # nothing. The status = 'active' clause (matching UserStatus.ACTIVE)
    # excludes an INVITED-but-not-yet-activated admin from being miscounted
    # as "another admin who can actually log in."
    result = db.execute(
        text("""
            UPDATE users
            SET is_active = false
            WHERE user_id = :admin_id
              AND role = 'superadmin'
              AND (
                SELECT COUNT(*) FROM users AS others
                WHERE others.role = 'superadmin'
                  AND others.is_active = true
                  AND others.is_locked = false
                  AND others.status = 'active'
                  AND others.user_id != :admin_id
              ) > 0
            RETURNING user_id
        """),
        {"admin_id": str(admin_id)},
    )
    if not result.fetchone():
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Cannot suspend the only remaining active superadmin.",
        )
    # Ashanti code ends here

    db.refresh(admin)  # local ORM object is stale after the raw UPDATE — resync it

    admin_id_val = admin.user_id
    admin_email = admin.email

    db.query(UserSession).filter(UserSession.user_id == admin.user_id).delete()
    db.commit()

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.ACCOUNT_SUSPENDED,
        title="Superadmin suspended",
        message=f"{admin_email}'s superadmin account has been suspended.",
        related_user_id=admin_id_val,
    )

    write_audit_log(
        db,
        user=current_user,
        action=AuditAction.SUSPEND_SUPERADMIN_ACCOUNT,
        target_table="users",
        target_id=admin_id_val,
        target_reference=admin_email,
        old_value={"status": "active"},
        new_value={"status": "suspended"},
        request=http_request,
        region_code=None,
        user_role_override="superadmin",
    )

    return {"message": "Superadmin account suspended successfully"}


@router.post("/{admin_id}/reactivate")
def reactivate_superadmin(
    admin_id: uuid.UUID,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    admin = db.query(User).filter(User.user_id == admin_id, User.role == "superadmin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Superadmin not found")
    admin.is_active = True

    admin_id_val = admin.user_id
    admin_email = admin.email

    db.commit()

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.ACCOUNT_REACTIVATED,
        title="Superadmin reactivated",
        message=f"{admin_email}'s superadmin account has been reactivated.",
        related_user_id=admin_id_val,
    )

    write_audit_log(
        db,
        user=current_user,
        action=AuditAction.REACTIVATE_SUPERADMIN_ACCOUNT,
        target_table="users",
        target_id=admin_id_val,
        target_reference=admin_email,
        old_value={"status": "suspended"},
        new_value={"status": "active"},
        request=http_request,
        region_code=None,
        user_role_override="superadmin",
    )

    return {"message": "Superadmin account reactivated successfully"}


@router.delete("/{admin_id}")
def delete_superadmin(
    admin_id: uuid.UUID,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    if admin_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")

    db.execute(text("SET app.bypass_rls = 'true'"))
    admin = db.query(User).filter(User.user_id == admin_id, User.role == "superadmin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Superadmin not found")

    if not (admin.status == UserStatus.ACTIVE and not admin.is_active) and admin.status != UserStatus.INVITED:
        raise HTTPException(status_code=400, detail="Only suspended superadmins or invited/expired invitations can be deleted.")

    deleted_admin_id = admin.user_id
    deleted_admin_email = admin.email
    deleted_admin_previous_status = "suspended" if (admin.status == UserStatus.ACTIVE and not admin.is_active) else "invited"

    notification_service.create_notification_for_all_superadmins(
            db=db,
            event_type=NotificationEventType.ACCOUNT_DELETED,
            title="Superadmin deleted",
            message=f"{deleted_admin_email}'s superadmin account has been deleted.",
            related_user_id=deleted_admin_id,
        )
    

    db.query(AccountInvitationToken).filter(AccountInvitationToken.user_id == admin_id).delete()
    db.delete(admin)
    db.commit()

    
    write_audit_log(
        db,
        user=current_user,
        action=AuditAction.DELETE_SUPERADMIN_ACCOUNT,
        target_table="users",
        target_id=deleted_admin_id,
        target_reference=deleted_admin_email,
        old_value={"status": deleted_admin_previous_status},
        new_value={"status": "deleted"},
        request=http_request,
        region_code=None,
        user_role_override="superadmin",
    )

    return {"message": "Superadmin deleted successfully"}



@router.post("/{admin_id}/activate")
async def activate_superadmin_endpoint(
    admin_id: uuid.UUID,
    http_request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    admin_id_val, admin_email = activate_superadmin(db, admin_id, activated_by=current_user, request=http_request)
    background_tasks.add_task(send_superadmin_activation_email, admin_email)
    return {"message": "Superadmin account activated."}


@router.post("/{admin_id}/unlock")
def unlock_superadmin(
    admin_id: uuid.UUID,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    admin = db.query(User).filter(User.user_id == admin_id, User.role == "superadmin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Superadmin not found")
    admin.is_locked = False
    admin.failed_login_attempts = 0
    admin.locked_until = None
    admin.failed_otp_attempts = 0

    admin_id_val = admin.user_id
    admin_email = admin.email

    db.commit()

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.ACCOUNT_UNLOCKED,
        title="Superadmin unlocked",
        message=f"{admin_email}'s superadmin account has been unlocked.",
        related_user_id=admin_id_val,
    )

    write_audit_log(
        db,
        user=current_user,
        action=AuditAction.UNLOCK_SUPERADMIN_ACCOUNT,
        target_table="users",
        target_id=admin_id_val,
        target_reference=admin_email,
        old_value={"status": "locked"},
        new_value={"status": "active"},
        request=http_request,
        region_code=None,
        user_role_override="superadmin",
    )

    return {"message": "Superadmin account unlocked successfully"}