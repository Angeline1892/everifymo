# backend/app/desktop/services/auth/superadmin_auth.py
from sqlalchemy.orm import Session
from sqlalchemy import update
from datetime import datetime, timedelta, timezone


from fastapi import Request
from app.models.users import User
from app.core.security import verify_password, hash_password
from app.core.constants import UserStatus, AuditAction
from app.core.audit import write_audit_log
from app.desktop.services.superadmin_notifications import superadmin_notification_service as notification_service
from app.desktop.schemas.superadmin_notifications.notification_enums import NotificationEventType




class SuperadminThrottledError(Exception):
    """
    Raised when the (last-admin) account is temporarily throttled.
    Carries retry_after_seconds as structured data so the route layer can
    return it as a real field instead of the frontend having to parse it
    out of a human-readable message string.
    """
    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Too many failed attempts. Try again in {retry_after_seconds} seconds.")


# Precompute a dummy hash once at import time so a "user not found" lookup still
# pays the same bcrypt/argon2 cost as a real lookup (timing-attack mitigation).
# This value is never a valid credential for any account.
_DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-timing-safety-only")


# Growing cooldown windows applied after every 5 failed attempts, instead of a
# permanent lock. Cycle 1 (attempts 5-9) -> 30s, cycle 2 (10-14) -> 2min, etc.
# Caps at the last value for very persistent attackers.
_LOCKOUT_BACKOFF_SECONDS = [30, 120, 300, 900, 3600]  # 30s, 2m, 5m, 15m, 1h




def _backoff_seconds_for(attempts: int) -> int:
    cycle_index = (attempts // 5) - 1
    cycle_index = max(0, min(cycle_index, len(_LOCKOUT_BACKOFF_SECONDS) - 1))
    return _LOCKOUT_BACKOFF_SECONDS[cycle_index]




def _is_last_active_superadmin(db: Session, user: User) -> bool:
    other_active_unlocked = (
        db.query(User)
        .filter(
            User.role == "superadmin",
            User.user_id != user.user_id,
            User.is_active == True,
            User.is_locked == False,
            User.status == UserStatus.ACTIVE,
        )
        .count()
    )
    return other_active_unlocked == 0




def _record_failed_attempt_atomic(db: Session, user: User) -> int:
    """
    Atomically increments failed_login_attempts at the DB level (avoids the
    read-then-write race that a plain `user.failed_login_attempts += 1` has
    under concurrent requests) and returns the new count.
    """
    stmt = (
        update(User)
        .where(User.user_id == user.user_id)
        .values(failed_login_attempts=User.failed_login_attempts + 1)
        .execution_options(synchronize_session="fetch")
    )
    db.execute(stmt)
    db.commit()
    db.refresh(user)
    return user.failed_login_attempts




def authenticate_superadmin(db: Session, email: str, password: str, http_request: Request | None = None) -> User:
    user = db.query(User).filter(User.email == email).first()


    # --- Enumeration-sensitive states stay generic, regardless of password -
    # A stranger who hasn't proven they know the password learns nothing from
    # these: no such user, wrong role, or (further below) pending/inactive.
    # Still run a real hash comparison against a dummy hash here even though
    # we're about to reject anyway — otherwise a nonexistent email responds
    # faster than a real one, and that timing gap itself leaks existence.
    if not user or user.role != "superadmin":
        verify_password(password, user.password_hash if user else _DUMMY_PASSWORD_HASH)
        raise ValueError("Invalid credentials")


    # --- Lockout/throttle state surfaces immediately, win or lose the ------
    # --- password check on THIS attempt. This state is a direct, expected --
    # --- consequence of 5+ failed attempts already made against THIS -------
    # --- account, so there's no meaningful new info being leaked by --------
    # --- surfacing it right away instead of gating it behind a correct -----
    # --- password guess. This also fixes the "guess right just to find out
    # --- you're locked" UX problem.
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds())
        raise SuperadminThrottledError(retry_after_seconds=remaining)


    if user.is_locked:
        raise ValueError("Account is locked. Please contact your administrator.")


    # --- Timing-safe password check -----------------------------------------
    # Always run a real hash comparison (never short-circuit) so response
    # time doesn't vary in a way that leaks information.
    password_ok = verify_password(password, user.password_hash)


    if not password_ok:
        _handle_failed_attempt(db, user, http_request)
        raise ValueError("Invalid credentials")


    # --- Past this point the password is confirmed correct, so it's safe to
    # --- give the real account owner specific, actionable feedback. --------


    if user.status == UserStatus.PENDING_APPROVAL:
        raise ValueError("Your account is awaiting activation from a fellow Superadmin.")


    if not user.is_active:
        raise ValueError("Account is inactive")


    # Successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    return user




def _handle_failed_attempt(db: Session, user: User, http_request: Request | None = None) -> None:
    attempts = _record_failed_attempt_atomic(db, user)


    if attempts > 0 and attempts % 5 == 0:
        is_last_admin = _is_last_active_superadmin(db, user)


        if is_last_admin:
            # Never permanently lock the only active superadmin — throttle
            # with a growing cooldown instead of bricking access.
            backoff = _backoff_seconds_for(attempts)
            user.locked_until = datetime.now(timezone.utc) + timedelta(seconds=backoff)
            db.commit()
            notification_service.create_notification_for_all_superadmins(
                db=db,
                event_type=NotificationEventType.FAILED_LOGIN_WARNING,
                title="Last superadmin under repeated attack",
                message=(
                    f"{user.email} has hit {attempts} failed login attempts and is the "
                    f"only active superadmin. Account was throttled (locked out for "
                    f"{backoff}s) rather than permanently locked. Investigate immediately."
                ),
                related_user_id=user.user_id,
            )
        else:
            # Regular superadmins: hard lock, same as before. No timer here —
            # setting locked_until would let them see a "try again in Xs"
            # message that expires while is_locked still blocks them, which
            # is misleading. They need a real admin to unlock the account.
            user.is_locked = True

            # Capture before commit — same ObjectDeletedError reason as
            # everywhere else in this codebase.
            user_id = user.user_id
            user_email = user.email

            db.commit()
            notification_service.create_notification_for_all_superadmins(
                db=db,
                event_type=NotificationEventType.ACCOUNT_LOCKED,
                title="Account locked out",
                message=f"{user_email} has been locked out after {attempts} failed login attempts.",
                related_user_id=user_id,
            )
            write_audit_log(
                db,
                user=None,
                action=AuditAction.LOCK_SUPERADMIN_ACCOUNT,
                target_table="users",
                target_id=user_id,
                target_reference=user_email,
                old_value={"is_locked": False},
                new_value={"is_locked": True, "failed_login_attempts": attempts},
                request=http_request,
                region_code=None,
                user_role_override="superadmin",
                user_id_override=user_id,
            )
    elif attempts == 3:
        db.commit()
        notification_service.create_notification_for_all_superadmins(
            db=db,
            event_type=NotificationEventType.FAILED_LOGIN_WARNING,
            title="Repeated failed login attempts",
            message=f"{attempts} failed attempts on {user.email}.",
            related_user_id=user.user_id,
        )
    else:
        db.commit()
