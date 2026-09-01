# backend/app/desktop/routers/auth/password_reset.py    
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text

from fastapi import Request
from app.core.audit import write_audit_log, get_user_region_code
from app.core.constants import AuditAction

from app.database.sessions import get_db
from app.models.users import User
from app.desktop.schemas.auth.password_reset import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyResetOtpRequest,
)
from app.desktop.services.auth.otp_service import create_otp_for_user, verify_otp_for_user
from app.desktop.services.auth.email import send_superadmin_otp_email, send_personnel_otp_email
from app.core.security import hash_password
from app.desktop.services.superadmin_notifications import superadmin_notification_service as notification_service
from app.desktop.schemas.superadmin_notifications.notification_enums import NotificationEventType

router = APIRouter(prefix="/auth/password", tags=["auth-password"])


def _role_matches_portal(user: User | None, portal: str) -> bool:
    """Single source of truth for the portal/role check, used by all three
    password-reset endpoints so they can't drift out of sync with each other."""
    if user is None:
        return False
    if portal == "superadmin":
        return user.role == "superadmin"
    return user.role != "superadmin"  # portal == "personnel"


@router.post("/forgot")
async def forgot_password(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db.execute(text("SET app.bypass_rls = 'true'"))
    user = db.query(User).filter(User.email == payload.email).first()

    # NOTE: per team decision, this endpoint intentionally returns a
    # distinguishable response for invalid/nonexistent/locked/wrong-portal
    # emails vs. valid ones. This is a deliberate deviation from the
    # anti-enumeration pattern (OWASP ASVS 2.1.15 / user enumeration
    # prevention). Flagged to team lead; revisit if this becomes a concern.
    if not user or user.is_locked or not _role_matches_portal(user, payload.portal):
        raise HTTPException(status_code=400, detail="We couldn't process your request.")

    otp = create_otp_for_user(db, user)
    if user.role == "superadmin":
        background_tasks.add_task(send_superadmin_otp_email, user.email, otp)
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
    otp_token.is_used = True
    db.commit()

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.PASSWORD_CHANGED,
        title="Password reset completed",
        message=f"{user.email} reset their password via forgot-password flow.",
        related_user_id=user.user_id,
    )

    password_action = (
        AuditAction.UPDATE_SUPERADMIN_PASSWORD
        if user.role == "superadmin"
        else AuditAction.UPDATE_USER_PASSWORD
    )

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