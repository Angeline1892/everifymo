from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

from app.models.users import User
from app.models.user_sessions import UserSession
from app.core.constants import Role
from app.core.audit import write_audit_log, get_user_region_code
from app.desktop.services.admin_notifications import admin_notification_service as notification_service
from app.desktop.schemas.admin_notifications.notification_enums import NotificationEventType
from .guards import assert_same_agency_and_region, assert_not_self, get_target, action_for_role


def suspend_account(db: Session, actor: User, target_id, request=None):
    target = get_target(db, target_id)
    assert_not_self(actor, target)
    assert_same_agency_and_region(actor, target)

    if not target.is_active:
        raise HTTPException(status_code=400, detail="This account is already suspended.")

    if target.role == Role.NATIONAL_ADMIN:
        # Only the national admin workspace gets the "can't suspend the
        # last active one" protection — FDA/LEA regional admins do NOT
        # get this guard; a region can be left with zero active admins.
        result = db.execute(
            text("""
                UPDATE users
                SET is_active = false
                WHERE user_id = :target_id
                  AND (
                    SELECT COUNT(*) FROM users AS others
                    WHERE others.role = :role
                      AND others.is_active = true
                      AND others.is_locked = false
                      AND others.status = 'active'
                      AND others.user_id != :target_id
                  ) > 0
                RETURNING user_id
            """),
            {"target_id": str(target.user_id), "role": target.role},
        )
        if not result.fetchone():
            db.rollback()
            raise HTTPException(status_code=400, detail="Cannot suspend the last active national admin.")
        db.refresh(target)  # local ORM object is stale after the raw UPDATE
    else:
        target.is_active = False

    db.query(UserSession).filter(UserSession.user_id == target.user_id).delete()
    db.commit()

    target_id_val, target_email = target.user_id, target.email
    region_code = get_user_region_code(db, target) if target.region_id else None

    notification_service.notify_account_event(
        db=db, actor=actor, target_user_id=target_id_val,
        target_role=target.role, target_region_id=target.region_id,
        event_type=NotificationEventType.ACCOUNT_SUSPENDED,
        title="Account suspended",
        message=f"{target_email}'s account has been suspended.",
    )
    write_audit_log(
        db, user=actor, action=action_for_role(target.role, "SUSPEND"),
        target_table="users", target_id=target_id_val, target_reference=target_email,
        old_value={"status": "active"}, new_value={"status": "suspended"},
        request=request, region_code=region_code,
    )
    return target_id_val


def reactivate_account(db: Session, actor: User, target_id, request=None):
    target = get_target(db, target_id)
    assert_not_self(actor, target)
    assert_same_agency_and_region(actor, target)
    if target.is_active:
        raise HTTPException(status_code=400, detail="This account is not suspended.")

    target.is_active = True
    db.commit()

    target_id_val, target_email = target.user_id, target.email
    region_code = get_user_region_code(db, target) if target.region_id else None

    notification_service.notify_account_event(
        db=db, actor=actor, target_user_id=target_id_val,
        target_role=target.role, target_region_id=target.region_id,
        event_type=NotificationEventType.ACCOUNT_REACTIVATED,
        title="Account reactivated",
        message=f"{target_email}'s account has been reactivated.",
    )
    write_audit_log(
        db, user=actor, action=action_for_role(target.role, "REACTIVATE"),
        target_table="users", target_id=target_id_val, target_reference=target_email,
        old_value={"status": "suspended"}, new_value={"status": "active"},
        request=request, region_code=region_code,
    )
    return target_id_val


def unlock_account(db: Session, actor: User, target_id, request=None):
    target = get_target(db, target_id)
    assert_not_self(actor, target)
    assert_same_agency_and_region(actor, target)
    if not target.is_locked:
        raise HTTPException(status_code=400, detail="This account is not locked.")

    target.is_locked = False
    target.failed_login_attempts = 0
    target.failed_otp_attempts = 0
    target.locked_until = None
    db.commit()

    target_id_val, target_email = target.user_id, target.email
    region_code = get_user_region_code(db, target) if target.region_id else None

    notification_service.notify_account_event(
        db=db, actor=actor, target_user_id=target_id_val,
        target_role=target.role, target_region_id=target.region_id,
        event_type=NotificationEventType.ACCOUNT_UNLOCKED,
        title="Account unlocked",
        message=f"{target_email}'s account has been unlocked.",
    )
    write_audit_log(
        db, user=actor, action=action_for_role(target.role, "UNLOCK"),
        target_table="users", target_id=target_id_val, target_reference=target_email,
        old_value={"status": "locked"}, new_value={"status": "active"},
        request=request, region_code=region_code,
    )
    return target_id_val