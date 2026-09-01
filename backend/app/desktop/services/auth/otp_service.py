import secrets
from datetime import datetime, timedelta, timezone
from app.database.sessions import set_bypass_rls

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.otp_tokens import OTPToken
from app.models.users import User
from app.desktop.services.superadmin_notifications import superadmin_notification_service as notification_service
from app.desktop.schemas.superadmin_notifications.notification_enums import NotificationEventType
from app.core.constants import AuditAction
from app.core.audit import write_audit_log, get_user_region_code
# Ashanti code starts here
# Reuse the exact same throttle machinery the password-login path uses, so a
# superadmin can't be permanently locked out via OTP failures either. This is
# the same class/helpers imported by superadmin_login.py's exception handler.
from app.desktop.services.auth.superadmin_auth import (
    SuperadminThrottledError,
    _is_last_active_superadmin,
    _backoff_seconds_for,
)
# Ashanti code ends here


def generate_otp() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(settings.OTP_LENGTH))


def create_otp_for_user(db: Session, user: User) -> str:
    set_bypass_rls(db, True)
    """Generates a fresh OTP, invalidates old ones, stores hash, returns plain OTP to send by email.

    Note: this does NOT reset user.failed_otp_attempts. Requesting a new OTP gives the
    user a new code to try, not a new budget of attempts toward account lockout.
    """
    otp = generate_otp()

    # invalidate previous unused OTPs for this user
    db.query(OTPToken).filter(
        OTPToken.user_id == user.user_id,
        OTPToken.is_used.is_(False),
    ).update({"is_used": True})

    otp_token = OTPToken(
        user_id=user.user_id,
        otp_hash=hash_password(otp),  # reuse bcrypt hashing, don't store plaintext
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    )
    db.add(otp_token)
    db.commit()

    return otp


def verify_otp_for_user(db: Session, user: User, otp: str, http_request: Request | None = None) -> OTPToken:
    set_bypass_rls(db, True)
    """
    Returns the matching OTPToken if valid, else raises ValueError with a reason,
    or SuperadminThrottledError (see below) with structured retry_after_seconds.

    Two independent, non-interfering thresholds:
      - Per-token: after settings.OTP_MAX_ATTEMPTS wrong guesses against THIS code,
        the code is expired and the user must request a new one. This is a pure UX
        nudge and does NOT affect the account-level counter or lockout.
      - Per-account: user.failed_otp_attempts is cumulative, persists across OTP
        re-requests, and only resets to 0 on a correct OTP. Once it reaches 5:
          * superadmin, NOT the last active one -> permanently locked (is_locked=True),
            same as before, mirroring the password-auth lockout threshold exactly.
          * superadmin, IS the last active one -> throttled instead (locked_until
            set with the same growing backoff as the password path), never
            permanently locked, so the last admin is never bricked out.
          * any other role -> unchanged, permanently locked (is_locked=True).

    """
   
    # Mirror the password path: surface an active throttle immediately, before
    # even looking at the submitted OTP, so the frontend can run its countdown.
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds())
        raise SuperadminThrottledError(retry_after_seconds=remaining)
  
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

    # Per-token guidance only: forces a new code after N wrong tries on this one.
    # Does NOT lock the account and does NOT touch failed_otp_attempts.
    if otp_token.attempt_count >= settings.OTP_MAX_ATTEMPTS:
        otp_token.is_used = True
        db.commit()
        raise ValueError("Too many attempts on this code. Please request a new OTP.")

    if not verify_password(otp, otp_token.otp_hash):
        otp_token.attempt_count += 1
        user.failed_otp_attempts += 1

        # Ashanti code starts here
        if user.failed_otp_attempts >= 5 and not user.is_locked and not (
            user.locked_until and user.locked_until > datetime.now(timezone.utc)
        ):
            if user.role == "superadmin" and _is_last_active_superadmin(db, user):
                # Never permanently lock the only active superadmin — throttle
                # with the same growing backoff as the password-auth path.
                # No audit log here on purpose — this is a temporary cooldown,
                # not an actual lock (same reasoning as the password-auth path).
                backoff = _backoff_seconds_for(user.failed_otp_attempts)
                user.locked_until = datetime.now(timezone.utc) + timedelta(seconds=backoff)
                db.commit()
                notification_service.create_notification_for_all_superadmins(
                    db=db,
                    event_type=NotificationEventType.FAILED_LOGIN_WARNING,
                    title="Last superadmin under repeated attack",
                    message=(
                        f"{user.email} has hit {user.failed_otp_attempts} failed OTP attempts and is "
                        f"the only active superadmin. Account was throttled (locked out for "
                        f"{backoff}s) rather than permanently locked. Investigate immediately."
                    ),
                    related_user_id=user.user_id,
                )
                raise SuperadminThrottledError(retry_after_seconds=backoff)
            else:
                user.is_locked = True

                # Capture before commit — db.commit() expires this ORM
                # object, so reading user.email/user.role after would
                # raise ObjectDeletedError.
                user_id = user.user_id
                user_email = user.email
                user_role = user.role
                attempts = user.failed_otp_attempts
                # Personnel have a region; superadmins never do.
                region_code = get_user_region_code(db, user) if user_role != "superadmin" else None

                db.commit()
                notification_service.create_notification_for_all_superadmins(
                    db=db,
                    event_type=NotificationEventType.ACCOUNT_LOCKED,
                    title="Account locked out",
                    message=f"{user_email} has been locked out after {attempts} failed OTP attempts.",
                    related_user_id=user_id,
                )
                lock_action = (
                    AuditAction.LOCK_SUPERADMIN_ACCOUNT
                    if user_role == "superadmin"
                    else AuditAction.LOCK_PERSONNEL_ACCOUNT
                )
                write_audit_log(
                    db,
                    user=None,
                    action=lock_action,
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
        # Ashanti code ends here


        db.commit()

        if user.failed_otp_attempts == 3:
            notification_service.create_notification_for_all_superadmins(
                db=db,
                event_type=NotificationEventType.FAILED_LOGIN_WARNING,
                title="Repeated failed OTP attempts",
                message=f"{user.failed_otp_attempts} failed OTP attempts on {user.email}.",
                related_user_id=user.user_id,
            )

        raise ValueError("Invalid OTP.")

    # correct OTP — reset the cumulative failure counter
    if user.failed_otp_attempts != 0:
        user.failed_otp_attempts = 0
        db.commit()

    return otp_token