# backend/app/desktop/services/account_status/personnel.py
import re
import secrets
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.users import User
from app.core.constants import Role
from app.core.security import hash_password
from app.core.audit import write_audit_log, get_user_region_code
from .guards import assert_same_agency_and_region, get_target, action_for_role, assert_employee_id_available

from app.desktop.services.admin_notifications import admin_notification_service as notification_service
from app.desktop.schemas.admin_notifications.notification_enums import NotificationEventType
from app.desktop.services.account_status.guards import agency_of


PH_MOBILE_REGEX = re.compile(r"^09\d{9}$")
OPTIONAL_FIELDS = {"middle_name"}  # every other editable field is required if present


def edit_personnel_info(db: Session, actor: User, target_id, updates: dict, request=None):
    target = get_target(db, target_id)
    if target.role not in Role.PERSONNEL_ROLES:
        raise HTTPException(status_code=400, detail="Edit Info is only available for personnel accounts.")
    assert_same_agency_and_region(db, actor, target)

    # Enforce blank/null rules: only middle_name may be cleared. Every other
    # field, if included in the payload at all, must have a real value.
    for field, value in list(updates.items()):
        if field in OPTIONAL_FIELDS:
            updates[field] = value.strip() if value and value.strip() else None
            continue

        stripped = value.strip() if isinstance(value, str) else value
        if not stripped:
            raise HTTPException(
                status_code=400,
                detail=f"{field.replace('_', ' ').title()} is required and cannot be blank.",
            )
        updates[field] = stripped

    if "contact_number" in updates and not PH_MOBILE_REGEX.match(updates["contact_number"]):
        raise HTTPException(
            status_code=400,
            detail="Contact number must be exactly 11 digits and start with 09.",
        )

    if "employee_id" in updates:
        assert_employee_id_available(db, updates["employee_id"], exclude_user_id=target.user_id)

    old_value = {k: getattr(target, k) for k in updates.keys()}
    for field, value in updates.items():
        setattr(target, field, value)
    db.commit()

    target_id_val, target_email = target.user_id, target.email
    full_name = f"{target.first_name} {target.last_name}".strip()
    region_code = get_user_region_code(db, target)

    write_audit_log(
        db, user=actor, action=action_for_role(target.role, "EDIT_INFO"),
        target_table="users", target_id=target_id_val, target_reference=target_email,
        old_value=old_value, new_value=updates,
        request=request, region_code=region_code,
    )
    # DUAL-WRITE: co-admins in this personnel's region+agency get one row,
    # AND the affected personnel gets their own separate targeted row -
    # not a broadcast to other personnel. See notify_personnel_profile_updated.
    notification_service.notify_personnel_profile_updated(
        db=db, personnel=target,
        agency_admin_role=actor.role, agency=agency_of(actor.role),
        title="Personnel profile updated",
        admin_workspace_message=f"{target_email}'s profile information was updated.",
        personnel_message="Your profile information was updated by your agency administrator.",
    )

    return target_id_val, target_email, full_name


def reset_personnel_password(db: Session, actor: User, target_id, request=None):
    target = get_target(db, target_id)
    if target.role not in Role.PERSONNEL_ROLES:
        raise HTTPException(status_code=400, detail="Reset Password is only available for personnel accounts.")
    assert_same_agency_and_region(db, actor, target)
    if target.status != "active" or not target.is_active:
        raise HTTPException(status_code=400, detail="This account has no existing password to reset.")

    temp_password = secrets.token_urlsafe(9)
    target.password_hash = hash_password(temp_password)
    target.force_password_change = True
    full_name = f"{target.first_name} {target.last_name}".strip()

    db.commit()

    target_id_val, target_email = target.user_id, target.email
    region_code = get_user_region_code(db, target)

    write_audit_log(
        db, user=actor, action=action_for_role(target.role, "RESET_PASSWORD"),
        target_table="users", target_id=target_id_val, target_reference=target_email,
        old_value=None, new_value={"force_password_change": True},  # never log the temp password itself
        request=request, region_code=region_code,
    )
    # Personnel already gets a direct email with the temp password
    # (send_personnel_reset_password_email in the router) - this is just
    # for the admin workspace to see the request was fulfilled.
    notification_service.notify_account_event(
        db=db, actor=actor, target_user_id=target_id_val,
        target_role=target.role, target_region_id=target.region_id,
        event_type=NotificationEventType.PASSWORD_RESET_COMPLETED,
        title="Personnel password reset",
        message=f"{target_email}'s password was reset by an administrator.",
    )
    return target_id_val, target_email, full_name, temp_password