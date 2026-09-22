# backend/app/desktop/routers/auth/personnel_login.py   
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.sessions import get_db, set_bypass_rls
from app.desktop.schemas.auth.personnel_login import PersonnelLoginRequest, PersonnelOTPVerifyRequest
from app.desktop.services.auth.personnel_auth import authenticate_personnel
from app.desktop.services.auth.otp_service import create_otp_for_user, verify_otp_for_user
from app.desktop.services.auth.email import send_personnel_otp_email
from app.models.users import User
from app.core.security import create_desktop_access_token, generate_refresh_token, hash_refresh_token
from app.models.user_sessions import UserSession
from app.core.config import settings
from datetime import datetime, timezone, timedelta

from app.core.audit import write_audit_log, get_user_region_code
from app.core.constants import AuditAction, Role
from app.desktop.services.location.location_service import (
    log_personnel_location_and_check_geofence,
    get_client_ip,
    get_coordinates_from_ip,
)

router = APIRouter(prefix="/auth", tags=["personnel-auth"])

def _log_personnel_location_task(
    db: Session,
    user: User,
    session_id,
    request_latitude,
    request_longitude,
    source: str,
    http_request: Request,
    background_tasks: BackgroundTasks,
):
    """
    Runs AFTER the login response has already been sent to the client.
    IP-API lookup + geofence check / audit log / admin email alert —
    none of this ever gates login, so it must never block the response.
    """
    lat = request_latitude
    lng = request_longitude
    resolved_source = source

    if lat is None or lng is None:
        try:
            client_ip = get_client_ip(http_request)
            ip_coords = get_coordinates_from_ip(client_ip)
            if ip_coords:
                lat, lng = ip_coords
                resolved_source = "ip"
        except Exception as ip_exc:
            print(f"IP geolocation fallback exception: {ip_exc}")

    if lat is not None and lng is not None:
        try:
            log_personnel_location_and_check_geofence(
                db=db,
                personnel_user=user,
                latitude=lat,
                longitude=lng,
                source=resolved_source,
                session_id=session_id,
                background_tasks=background_tasks,
                http_request=http_request,
            )
        except Exception as loc_exc:
            print(f"Warning: Failed to log personnel location during verify-otp: {loc_exc}")


@router.post("/login")
async def personnel_login(
    request: PersonnelLoginRequest,
    http_request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    try:
        user = authenticate_personnel(db, request.email, request.password, request.agency, http_request)
    except ValueError as exc:
        # Attribute to the agency the person selected, even if the email
        # doesn't match a real user — so a bad-credentials attempt still
        # shows up on the right agency's audit tab, not bucketed as "system".
        failed_user = db.query(User).filter(User.email == request.email).first()
        agency_role_map = {"fda": Role.FDA_PERSONNEL, "lea": Role.LEA_PERSONNEL}
        role_override = failed_user.role if failed_user else agency_role_map.get(request.agency)
        write_audit_log(
            db,
            user=failed_user,
            action=AuditAction.LOGIN_FAILED,
            target_table="users",
            target_reference=request.email,
            new_value={"reason": str(exc)},
            request=http_request,
            region_code=get_user_region_code(db, failed_user) if failed_user else None,
            user_role_override=role_override,
        )
        raise HTTPException(status_code=400, detail=str(exc))

    otp = create_otp_for_user(db, user)
    background_tasks.add_task(send_personnel_otp_email, user.email, otp)

    return {"message": "OTP sent"}


@router.post("/verify-otp")
def verify_personnel_otp(
    request: PersonnelOTPVerifyRequest,
    http_request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    set_bypass_rls(db, True)
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    try:
        otp_token = verify_otp_for_user(db, user, request.otp, http_request)
    except ValueError as exc:
        # A wrong/expired OTP after the password already checked out is
        # still a failed login attempt — target is otp_tokens here since
        # that's the actual record being validated, not user_sessions
        # (no session exists yet at this point).
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

    access_token = create_desktop_access_token({
        "sub": str(user.user_id), 
        "role": user.role,
        "region_id": str(user.region_id),
    })

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

    # Location logging + geofence check are audit/alerting only — they never
    # gate login, so they run in the background after tokens are returned.
    background_tasks.add_task(
        _log_personnel_location_task,
        db,
        user,
        session.session_id,
        request.latitude,
        request.longitude,
        request.source or "gps",
        http_request,
        background_tasks,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "role": user.role,
        "force_password_change": user.force_password_change,
    }