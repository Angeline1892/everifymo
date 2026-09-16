# backend/app/desktop/services/auth/personnel_auth.py
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.sessions import set_bypass_rls
from datetime import datetime, timezone

from fastapi import Request
from app.models.users import User
from app.core.security import verify_password
from app.core.constants import Role, AuditAction
from app.core.audit import write_audit_log, get_user_region_code
from app.desktop.services.superadmin_notifications import superadmin_notification_service as notification_service
from app.desktop.schemas.superadmin_notifications.notification_enums import NotificationEventType


AGENCY_ROLE_MAP = {
    "fda": Role.FDA_PERSONNEL,
    "lea": Role.LEA_PERSONNEL,
}


def authenticate_personnel(
    db: Session,
    email: str,
    password: str,
    agency: str,
    http_request: Request | None = None,
) -> User:

    set_bypass_rls(db, True)   # was: db.execute(text("SET app.bypass_rls = 'true'"))
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise ValueError("Invalid credentials")

    expected_role = AGENCY_ROLE_MAP.get(agency)
    if expected_role is None:
        raise ValueError("Invalid agency selection")

    if user.role != expected_role:
        raise ValueError("Access Denied: Make sure you select the correct agency to sign in.")

    if user.status != "active":
        raise ValueError("Your account is not yet active. Please contact your administrator.")

    if not user.is_active:
        raise ValueError("Account is suspended.")

    if user.is_locked:
        raise ValueError("Account is locked. Please contact your administrator.")

    if not verify_password(password, user.password_hash):
        user.failed_login_attempts += 1
        just_locked = False
        if user.failed_login_attempts >= 5:
            user.is_locked = True
            just_locked = True

        # Capture everything we need BEFORE commit — db.commit() expires
        # this ORM object, so reading user.email/user.role/etc. afterward
        # would raise ObjectDeletedError.
        user_id = user.user_id
        user_email = user.email
        user_role = user.role
        attempts = user.failed_login_attempts
        region_code = get_user_region_code(db, user)

        db.commit()

        if just_locked:
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
                action=AuditAction.LOCK_PERSONNEL_ACCOUNT,
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
            raise ValueError("Too many failed login attempts. Your account has been locked. Please contact your administrator.")


        elif user.failed_login_attempts == 3:
            notification_service.create_notification_for_all_superadmins(
                db=db,
                event_type=NotificationEventType.FAILED_LOGIN_WARNING,
                title="Repeated failed login attempts",
                message=f"{user.failed_login_attempts} failed attempts on {user.email}.",
                related_user_id=user.user_id,
            )

        raise ValueError("Invalid credentials")

    user.failed_login_attempts = 0
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    return user