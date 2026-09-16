# backend/app/desktop/routers/auth/national_admin_login.py
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from app.core.constants import UserStatus, AuditAction, Role
from app.core.audit import write_audit_log, get_user_region_code
from app.database.sessions import get_db, set_bypass_rls
from app.desktop.schemas.auth.national_admin_login import NationalAdminLoginRequest, NationalAdminOTPVerifyRequest
from app.desktop.services.auth.national_admin_auth import authenticate_national_admin, NationalAdminThrottledError
from app.desktop.services.auth.otp_service import create_otp_for_user, verify_otp_for_user
from app.desktop.services.auth.email import send_national_admin_otp_email
from app.models.users import User
from app.core.security import create_desktop_access_token, generate_refresh_token, hash_refresh_token
from app.models.user_sessions import UserSession
from app.core.config import settings


router = APIRouter(prefix="/auth/national-admin", tags=["national-admin-auth"])


@router.post("/login")
async def national_admin_login(request: NationalAdminLoginRequest, http_request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    set_bypass_rls(db, True)
    try:
        user = authenticate_national_admin(db, request.email, request.password, http_request)
    except NationalAdminThrottledError as exc:
        # Same account, temporarily throttled after repeated failures. Return
        # retry_after_seconds as a real field so the frontend can run a live
        # countdown instead of parsing it out of the message text.
        throttled_user = db.query(User).filter(User.email == request.email).first()
        write_audit_log(
            db,
            user=throttled_user,
            action=AuditAction.LOGIN_FAILED,
            target_table="users",
            target_reference=request.email,
            new_value={"reason": str(exc), "retry_after_seconds": exc.retry_after_seconds},
            request=http_request,
            region_code=get_user_region_code(db, throttled_user) if throttled_user else None,
            user_role_override=Role.NATIONAL_ADMIN,
        )
        raise HTTPException(
            status_code=429,
            detail={"message": str(exc), "retry_after_seconds": exc.retry_after_seconds},
        )
    except ValueError as exc:
        failed_user = db.query(User).filter(User.email == request.email).first()
        write_audit_log(
            db,
            user=failed_user,
            action=AuditAction.LOGIN_FAILED,
            target_table="users",
            target_reference=request.email,
            new_value={"reason": str(exc)},
            request=http_request,
            region_code=get_user_region_code(db, failed_user) if failed_user else None,
            user_role_override=Role.NATIONAL_ADMIN,
        )
        raise HTTPException(status_code=400, detail=str(exc))

    if user.status == UserStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=403,
            detail="Your account is awaiting activation from a fellow National Admin. You'll receive an email once it's activated.",
        )
    if user.status == UserStatus.INVITED:
        raise HTTPException(
            status_code=403,
            detail="Please complete your registration using the invitation link sent to your email.",
        )

    otp = create_otp_for_user(db, user)
    background_tasks.add_task(send_national_admin_otp_email, user.email, otp)

    return {"message": "OTP sent"}


@router.post("/verify-otp")
def verify_otp(request: NationalAdminOTPVerifyRequest, http_request: Request, db: Session = Depends(get_db)):
    set_bypass_rls(db, True)
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    try:
        otp_token = verify_otp_for_user(db, user, request.otp, http_request)
    # Ashanti code starts here
    # Same treatment as the password-login path: a throttled last-active-national-admin
    # gets a structured 429 with retry_after_seconds instead of a hard 400 lock message.
    except NationalAdminThrottledError as exc:
        write_audit_log(
            db,
            user=user,
            action=AuditAction.LOGIN_FAILED,
            target_table="otp_tokens",
            target_reference=request.email,
            new_value={"reason": str(exc), "retry_after_seconds": exc.retry_after_seconds},
            request=http_request,
            region_code=get_user_region_code(db, user),
        )
        raise HTTPException(
            status_code=429,
            detail={"message": str(exc), "retry_after_seconds": exc.retry_after_seconds},
        )
    # Ashanti code ends here
    except ValueError as exc:
        write_audit_log(
            db,
            user=user,
            action=AuditAction.LOGIN_FAILED,
            target_table="otp_tokens",
            target_reference=request.email,
            new_value={"reason": str(exc)},
            request=http_request,
            region_code=get_user_region_code(db, user),
        )
        raise HTTPException(status_code=400, detail=str(exc))

    otp_token.is_used = True
    db.commit()

    access_token = create_desktop_access_token({"sub": str(user.user_id), "role": user.role})

    refresh_token = generate_refresh_token()
    refresh_hash = hash_refresh_token(refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    session = UserSession(
        user_id=user.user_id,
        refresh_token_hash=refresh_hash,
        expires_at=expires_at,
    )
    db.add(session)
    db.commit()

    write_audit_log(
        db,
        user=user,
        action=AuditAction.LOGIN,
        target_table="user_sessions",
        target_id=session.session_id,
        target_reference=request.email,
        request=http_request,
        region_code=get_user_region_code(db, user),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "force_password_change": user.force_password_change,
    }