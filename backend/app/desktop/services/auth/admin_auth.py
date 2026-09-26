# backend/app/desktop/services/auth/admin_auth.py
from sqlalchemy.orm import Session
from sqlalchemy import update
from datetime import datetime, timezone

from fastapi import Request
from app.models.users import User
from app.core.security import verify_password, hash_password
from app.core.constants import Role, UserStatus, AuditAction
from app.core.audit import write_audit_log, get_user_region_code
from app.desktop.services.admin_notifications import admin_notification_service as notification_service
from app.desktop.schemas.admin_notifications.notification_enums import NotificationEventType


_DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-timing-safety-only")

AGENCY_ROLE_MAP = {
    "fda": Role.FDA_ADMIN,
    "lea": Role.LEA_ADMIN,
}


def _record_failed_attempt_atomic(db: Session, user: User) -> int:
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


def authenticate_admin(
    db: Session,
    email: str,
    password: str,
    agency: str,
    http_request: Request | None = None,
) -> User:
    user = db.query(User).filter(User.email == email).first()

    expected_role = AGENCY_ROLE_MAP.get(agency)
    if expected_role is None:
        raise ValueError("Invalid agency selection")

    if not user or user.role != expected_role:
        verify_password(password, user.password_hash if user else _DUMMY_PASSWORD_HASH)
        raise ValueError("Access Denied: Make sure you select the correct agency to sign in.")

    # Admins never get the throttle-instead-of-lock treatment — only the
    # national admin does. An FDA/LEA admin who gets hard-locked can always
    # be unlocked by a national admin, so there's no "system is bricked"
    # risk here the way there is for the last national admin.
    if user.is_locked:
        raise ValueError("Account is locked. Please contact your administrator.")

    password_ok = verify_password(password, user.password_hash)

    if not password_ok:
        _handle_failed_attempt(db, user, http_request)
        raise ValueError("Invalid credentials")

    if user.status == UserStatus.PENDING_APPROVAL:
        raise ValueError("Your account is awaiting activation from a National Admin or a fellow Admin.")

    if not user.is_active:
        raise ValueError("Account is suspended. Please contact your administrator.")

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    return user


def _handle_failed_attempt(db: Session, user: User, http_request: Request | None = None) -> None:
    attempts = _record_failed_attempt_atomic(db, user)

    if attempts >= 5:
        user.is_locked = True
        user_id = user.user_id
        user_email = user.email
        user_role = user.role
        region_code = get_user_region_code(db, user)
        db.commit()

        notification_service.notify_self_service_account_event(
            db=db, target=user,
            event_type=NotificationEventType.ACCOUNT_LOCKED,
            title="Account locked out",
            message=f"{user_email} has been locked out after {attempts} failed login attempts.",
        )
        write_audit_log(
            db,
            user=None,
            action=AuditAction.LOCK_REGIONAL_ADMIN_ACCOUNT,
            target_table="users",
            target_id=user_id,
            target_reference=user_email,
            old_value={"is_locked": False},
            new_value={"is_locked": True, "failed_login_attempts": attempts},
            request=http_request,
            region_code=region_code,
            user_role_override=user_role,
            user_id_override=user_id,
        )
    elif attempts == 3:
        db.commit()
        notification_service.notify_self_service_account_event(
            db=db, target=user,
            event_type=NotificationEventType.FAILED_LOGIN_WARNING,
            title="Repeated failed login attempts",
            message=f"{attempts} failed attempts on {user.email}.",
        )
    else:
        db.commit()