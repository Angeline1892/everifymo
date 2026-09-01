# backend/app/desktop/routers/profile_setting/profile.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from fastapi import Request
from app.core.audit import write_audit_log, get_user_region_code
from app.core.constants import AuditAction

from app.database.sessions import get_db
from app.models.user_sessions import UserSession
from app.models.users import User
from app.models.regions import Region
from app.desktop.schemas.profile_setting.profile import (
    ProfileResponse,
    ProfileUpdateRequest,
    ChangePasswordRequest,
)
from app.core.dependencies import get_current_user
from app.core.security import hash_password, verify_password
from app.desktop.services.superadmin_notifications import superadmin_notification_service as notification_service
from app.desktop.schemas.superadmin_notifications.notification_enums import NotificationEventType

router = APIRouter(prefix="/profile", tags=["profile"])

AGENCY_LABELS = {
    "fda_personnel": "FDA",
    "lea_personnel": "LEA-CIDG",
    "superadmin": "SUPERADMIN",
}


def build_profile_response(db: Session, user: User) -> ProfileResponse:
    region_name = None
    if user.region_id:
        region = db.query(Region).filter(Region.region_id == user.region_id).first()
        region_name = region.region_name if region else None

    return ProfileResponse(
        user_id=user.user_id,
        first_name=user.first_name,
        middle_name=user.middle_name,
        last_name=user.last_name,
        employee_id=user.employee_id,
        email=user.email,
        contact_number=user.contact_number,
        department=user.department,
        position=user.position,
        role=user.role,
        agency=AGENCY_LABELS.get(user.role, user.role),
        region=region_name,
    )


@router.get("", response_model=ProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return build_profile_response(db, current_user)


from app.desktop.services.superadmin_notifications import superadmin_notification_service as notification_service
from app.desktop.schemas.superadmin_notifications.notification_enums import NotificationEventType

# ... (already imported at the top for change_password, so no new import needed)

@router.put("/update", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = payload.model_dump(exclude_unset=True)

    if "employee_id" in update_data and update_data["employee_id"]:
        existing = (
            db.query(User)
            .filter(
                User.employee_id == update_data["employee_id"],
                User.user_id != current_user.user_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="This Employee ID is already in use.")

    # capture the "before" values for exactly the fields being changed,
    # before setattr() overwrites them
    old_data = {field: getattr(current_user, field, None) for field in update_data}

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    if update_data:
        notification_service.create_notification_for_all_superadmins(
            db=db,
            event_type=NotificationEventType.ACCOUNT_INFO_UPDATED,
            title="Profile information updated",
            message=f"{current_user.email} updated their profile information.",
            related_user_id=current_user.user_id,
        )

        write_audit_log(
            db,
            user=current_user,
            action=AuditAction.UPDATE_USER_PROFILE,
            target_table="users",
            target_id=current_user.user_id,
            target_reference=f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email,
            old_value=old_data,
            new_value=update_data,
            request=http_request,
            region_code=get_user_region_code(db, current_user),
        )

    return build_profile_response(db, current_user)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.password_hash or not verify_password(
        payload.current_password, current_user.password_hash
    ):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.password_hash = hash_password(payload.new_password)
    current_user.force_password_change = False
    db.query(UserSession).filter(UserSession.user_id == current_user.user_id).update(
    {"is_revoked": True}
    )
    db.commit()

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.PASSWORD_CHANGED,
        title="Password changed",
        message=f"{current_user.email} changed their password.",
        related_user_id=current_user.user_id,
    )

    password_action = (
        AuditAction.UPDATE_SUPERADMIN_PASSWORD
        if current_user.role == "superadmin"
        else AuditAction.UPDATE_USER_PASSWORD
    )

    write_audit_log(
        db,
        user=current_user,
        action=password_action,
        target_table="users",
        target_id=current_user.user_id,
        target_reference=current_user.email,
        request=http_request,
        region_code=get_user_region_code(db, current_user),
    )

    return {"message": "Password updated successfully"}


PERSONNEL_EDITABLE_FIELDS = {
    "first_name", "middle_name", "last_name",
    "employee_id", "contact_number", "department", "position",
}
SUPERADMIN_EDITABLE_FIELDS = {"first_name", "middle_name", "last_name"}


@router.put("/update", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = payload.model_dump(exclude_unset=True)

    allowed_fields = (
        SUPERADMIN_EDITABLE_FIELDS
        if current_user.role == "superadmin"
        else PERSONNEL_EDITABLE_FIELDS
    )
    disallowed = set(update_data.keys()) - allowed_fields
    if disallowed:
        raise HTTPException(
            status_code=403,
            detail=f"You are not permitted to update: {', '.join(sorted(disallowed))}",
        )

    if "employee_id" in update_data and update_data["employee_id"]:
        existing = (
            db.query(User)
            .filter(
                User.employee_id == update_data["employee_id"],
                User.user_id != current_user.user_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="This Employee ID is already in use.")

    # capture the "before" values for exactly the fields being changed,
    # before setattr() overwrites them
    old_data = {field: getattr(current_user, field, None) for field in update_data}

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    if update_data:
        notification_service.create_notification_for_all_superadmins(
            db=db,
            event_type=NotificationEventType.ACCOUNT_INFO_UPDATED,
            title="Profile information updated",
            message=f"{current_user.email} updated their profile information.",
            related_user_id=current_user.user_id,
        )

        write_audit_log(
            db,
            user=current_user,
            action=AuditAction.UPDATE_USER_PROFILE,
            target_table="users",
            target_id=current_user.user_id,
            target_reference=f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email,
            old_value=old_data,
            new_value=update_data,
            request=http_request,
            region_code=get_user_region_code(db, current_user),
        )

    return build_profile_response(db, current_user)