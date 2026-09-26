# backend/app/desktop/services/auth/otp_service.py
import secrets
from datetime import datetime, timedelta, timezone
from app.database.sessions import set_bypass_rls

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.otp_tokens import OTPToken
from app.models.users import User
from app.desktop.services.admin_notifications import admin_notification_service as notification_service
from app.desktop.schemas.admin_notifications.notification_enums import NotificationEventType
from app.core.constants import AuditAction, Role
from app.core.audit import write_audit_log, get_user_region_code

from app.desktop.services.auth.national_admin_auth import (
    NationalAdminThrottledError,
    _try_hard_lock_if_not_last_national_admin,
    _backoff_seconds_for as _national_admin_backoff_seconds_for,
)


def generate_otp() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(settings.OTP_LENGTH))


def create_otp_for_user(db: Session, user: User) -> str:
    set_bypass_rls(db, True)
    """Generates a fresh OTP, invalidates old ones, stores hash, returns plain OTP to send by email.

    Note: this does NOT reset user.failed_otp_attempts. Requesting a new OTP gives the
    user a new code to try, not a new budget of attempts toward account lockout.
    """
    otp = generate_otp()

    db.query(OTPToken).filter(
        OTPToken.user_id == user.user_id,
        OTPToken.is_used.is_(False),
    ).update({"is_used": True})

    otp_token = OTPToken(
        user_id=user.user_id,
        otp_hash=hash_password(otp),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    )
    db.add(otp_token)
    db.commit()

    return otp


# admin_auth no longer exports AdminThrottledError / _is_last_active_admin —
# admins always hard-lock now, same as personnel.


def _throttle_for_role(db: Session, user: User):
    """
    Returns (throttled_error_cls, try_atomic_lock_fn, backoff_fn) ONLY for
    the national admin. try_atomic_lock_fn(db, user) attempts to hard-lock
    the user atomically (see its docstring for why this must be race-safe
    across ALL national admins, not just per-row) and returns True if the
    lock was applied, False if blocked because this is the last active
    national admin — caller should throttle instead in that case.

    FDA/LEA admins and personnel always hard-lock — an admin lockout can
    always be resolved by a national admin, so there's no equivalent
    "system is bricked" risk to protect against for them.
    """
    if user.role == Role.NATIONAL_ADMIN:
        return NationalAdminThrottledError, _try_hard_lock_if_not_last_national_admin, _national_admin_backoff_seconds_for
    return None


def _lock_action_for_role(role: str) -> str:
    if role == Role.NATIONAL_ADMIN:
        return AuditAction.LOCK_NATIONAL_ADMIN_ACCOUNT
    if role in Role.ADMIN_ROLES:
        return AuditAction.LOCK_ADMIN_ACCOUNT
    return AuditAction.LOCK_PERSONNEL_ACCOUNT


def verify_otp_for_user(db: Session, user: User, otp: str, http_request: Request | None = None) -> OTPToken:
    set_bypass_rls(db, True)
    """
    Returns the matching OTPToken if valid, else raises ValueError with a reason,
    or NationalAdminThrottledError with structured retry_after_seconds.

    Two independent, non-interfering thresholds:
    - Per-token: after settings.OTP_MAX_ATTEMPTS wrong guesses against THIS code,
        the code is expired and the user must request a new one. Pure UX nudge,
        does NOT affect the account-level counter or lockout.
    - Per-account: user.failed_otp_attempts is cumulative, persists across OTP
        re-requests, and only resets to 0 on a correct OTP. Once it reaches 5:
        * national_admin, NOT the last active one -> permanently locked
        * national_admin, IS the last active one -> throttled (system-wide)
        * admin, personnel -> always permanently locked. An admin lockout can
            always be resolved by a national admin, so there's no equivalent
            "system is bricked" risk to protect against here.
    """

    throttle_info = _throttle_for_role(db, user)
    throttled_cls = throttle_info[0] if throttle_info else None

    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds())
        raise (throttled_cls or ValueError)(retry_after_seconds=remaining) if throttled_cls else ValueError(
            "Account is temporarily locked. Please try again later."
        )

    if user.is_locked:
        raise ValueError("Account is locked. Please contact your administrator.")

    otp_token = (
        db.query(OTPToken)
        .filter(OTPToken.user_id == user.user_id, OTPToken.is_used.is_(False))
        .order_by(OTPToken.created_at.desc())
        .first()
    )

    if not otp_token:
        raise ValueError("No active OTP found. Please request a new one.")

    if otp_token.expires_at < datetime.now(timezone.utc):
        raise ValueError("OTP has expired. Please request a new one.")

    if otp_token.attempt_count >= settings.OTP_MAX_ATTEMPTS:
        otp_token.is_used = True
        db.commit()
        raise ValueError("Too many attempts on this code. Please request a new OTP.")

    if not verify_password(otp, otp_token.otp_hash):
        otp_token.attempt_count += 1
        user.failed_otp_attempts += 1

        if user.failed_otp_attempts >= 5 and not user.is_locked and not (
            user.locked_until and user.locked_until > datetime.now(timezone.utc)
        ):
            if throttle_info:
                throttled_cls, try_lock_fn, backoff_fn = throttle_info
                hard_locked = try_lock_fn(db, user)

                if not hard_locked:
                    backoff = backoff_fn(user.failed_otp_attempts)
                    user.locked_until = datetime.now(timezone.utc) + timedelta(seconds=backoff)
                    db.commit()
                    notification_service.notify_self_service_account_event(
                        db=db, target=user,
                        event_type=NotificationEventType.FAILED_LOGIN_WARNING,
                        title="Last active account under repeated attack",
                        message=(
                            f"{user.email} has hit {user.failed_otp_attempts} failed OTP "
                            f"attempts and is the only active account of its kind. "
                            f"Account was throttled (locked out for {backoff}s) rather "
                            f"than permanently locked. Investigate immediately."
                        ),
                    )
                    raise throttled_cls(retry_after_seconds=backoff)

                db.refresh(user)
            else:
                user.is_locked = True

            user_id = user.user_id
            user_email = user.email
            user_role = user.role
            attempts = user.failed_otp_attempts
            region_code = get_user_region_code(db, user) if user_role != Role.NATIONAL_ADMIN else None

            db.commit()
            notification_service.notify_self_service_account_event(
                db=db, target=user,
                event_type=NotificationEventType.ACCOUNT_LOCKED,
                title="Account locked out",
                message=f"{user_email} has been locked out after {attempts} failed OTP attempts.",
            )
            write_audit_log(
                db,
                user=None,
                action=_lock_action_for_role(user_role),
                target_table="users",
                target_id=user_id,
                target_reference=user_email,
                old_value={"is_locked": False},
                new_value={"is_locked": True, "failed_otp_attempts": attempts},
                request=http_request,
                region_code=region_code,
                user_role_override=user_role,
                user_id_override=user_id,
            )
            raise ValueError("Too many failed OTP attempts. Your account has been locked. Please contact your administrator.")

        db.commit()

        if user.failed_otp_attempts == 3:
            notification_service.notify_self_service_account_event(
                db=db, target=user,
                event_type=NotificationEventType.FAILED_LOGIN_WARNING,
                title="Repeated failed OTP attempts",
                message=f"{user.failed_otp_attempts} failed OTP attempts on {user.email}.",
            )

        raise ValueError("Invalid OTP.")

    if user.failed_otp_attempts != 0:
        user.failed_otp_attempts = 0
        db.commit()

    return otp_token