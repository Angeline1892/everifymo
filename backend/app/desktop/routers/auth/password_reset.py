# backend/app/desktop/routers/auth/password_reset.py    
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone

from fastapi import Request
from app.core.audit import write_audit_log, get_user_region_code
from app.core.constants import AuditAction
from app.core.constants import Role  # already partially imported elsewhere in your app

from app.database.sessions import get_db
from app.models.users import User
from app.desktop.schemas.auth.password_reset import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyResetOtpRequest,
)
from app.desktop.services.auth.otp_service import create_otp_for_user, verify_otp_for_user
from app.desktop.services.auth.email import (
    send_national_admin_otp_email,
    send_admin_otp_email,
    send_personnel_otp_email,
)
from app.core.security import hash_password
from app.desktop.services.admin_notifications import admin_notification_service as notification_service
from app.desktop.schemas.admin_notifications.notification_enums import NotificationEventType

router = APIRouter(prefix="/auth/password", tags=["auth-password"])



def _role_matches_portal(user: User | None, portal: str) -> bool:
    """Strict allow-list per portal — a user must match one of the roles
    listed for the portal they're resetting through. No fallback branch,
    so an unrecognized portal value matches nobody (fails closed)."""
    if user is None:
        return False
    if portal == "national-admin":
        return user.role == Role.NATIONAL_ADMIN
    if portal == "interagency-admin":
        return user.role in (Role.FDA_ADMIN, Role.LEA_ADMIN)  # confirm these names
    if portal == "personnel":
        return user.role in (Role.FDA_PERSONNEL, Role.LEA_PERSONNEL)
    return False


def _is_temporarily_throttled(user: User) -> bool:
    return bool(user.locked_until and user.locked_until > datetime.now(timezone.utc))


@router.post("/forgot")
async def forgot_password(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db.execute(text("SET app.bypass_rls = 'true'"))
    user = db.query(User).filter(User.email == payload.email).first()

    # NOTE: per team decision, this endpoint intentionally returns a
    # distinguishable response for invalid/nonexistent/locked/wrong-portal
    # emails vs. valid ones. This is a deliberate deviation from the
    # anti-enumeration pattern (OWASP ASVS 2.1.15 / user enumeration
    # prevention). Flagged to team lead; revisit if this becomes a concern.
    #
    # Also blocks a THROTTLED national admin (locked_until still in the
    # future) from requesting a fresh OTP here. Without this, a throttled
    # admin could get a new code mid-cooldown; verify_otp_for_user would
    # still reject it downstream on the locked_until check, but rejecting
    # it here is more honest — no point emailing an OTP the account can't
    # use yet.
    if not user or user.is_locked or _is_temporarily_throttled(user) or not _role_matches_portal(user, payload.portal):
        raise HTTPException(status_code=400, detail="We couldn't process your request.")

    otp = create_otp_for_user(db, user)
    if user.role == Role.NATIONAL_ADMIN:
        background_tasks.add_task(send_national_admin_otp_email, user.email, otp)
    elif user.role in Role.ADMIN_ROLES:
        background_tasks.add_task(send_admin_otp_email, user.email, otp)
    else:
        background_tasks.add_task(send_personnel_otp_email, user.email, otp)

    return {"message": "OTP sent to your email."}


@router.post("/verify-otp")
def verify_reset_otp(payload: VerifyResetOtpRequest, db: Session = Depends(get_db)):
    db.execute(text("SET app.bypass_rls = 'true'"))
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not _role_matches_portal(user, payload.portal):
        raise HTTPException(status_code=400, detail="Invalid or expired code.")

    try:
        verify_otp_for_user(db, user, payload.otp)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {"message": "OTP verified"}


@router.post("/reset")
def reset_password(payload: ResetPasswordRequest, http_request: Request, db: Session = Depends(get_db)):
    db.execute(text("SET app.bypass_rls = 'true'"))
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not _role_matches_portal(user, payload.portal):
        raise HTTPException(status_code=400, detail="Invalid request")

    try:
        otp_token = verify_otp_for_user(db, user, payload.otp)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    user.password_hash = hash_password(payload.new_password)
    user.force_password_change = False
    # A successful reset is a stronger identity proof than a successful
    # login (it required a fresh OTP, not just the old password), so it
    # should clear the same counter a successful login would have.
    # Without this, someone who legitimately forgot their password could
    # reset it and still be sitting a few attempts away from lockout on
    # their very next login.
    user.failed_login_attempts = 0
    user.failed_otp_attempts = 0
    otp_token.is_used = True
    db.commit()

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.PASSWORD_CHANGED,
        title="Password reset completed",
        message=f"{user.email} reset their password via forgot-password flow.",
        related_user_id=user.user_id,
    )

    if user.role == Role.NATIONAL_ADMIN:
        password_action = AuditAction.UPDATE_SUPERADMIN_PASSWORD
    elif user.role in Role.ADMIN_ROLES:
        password_action = AuditAction.UPDATE_ADMIN_PASSWORD
    else:
        password_action = AuditAction.UPDATE_USER_PASSWORD

    write_audit_log(
        db,
        user=user,
        action=password_action,
        target_table="users",
        target_id=user.user_id,
        target_reference=user.email,
        request=http_request,
        region_code=get_user_region_code(db, user),
    )

    return {"message": "Password updated"}