# app/routers/auth/password_change.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from fastapi import Request
from app.core.audit import write_audit_log, get_user_region_code
from app.core.constants import AuditAction

from app.database.sessions import get_db
from app.core.dependencies import get_current_user
from app.core.security import verify_password, hash_password
from app.models.users import User
from app.desktop.schemas.auth.password_change import ChangePasswordRequest
from app.desktop.services.superadmin_notifications import superadmin_notification_service as notification_service
from app.desktop.schemas.superadmin_notifications.notification_enums import NotificationEventType

router = APIRouter(prefix="/auth/password", tags=["auth-password"])


@router.post("/change")
def change_password(
    payload: ChangePasswordRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.password_hash = hash_password(payload.new_password)
    current_user.force_password_change = False
    db.commit()

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.PASSWORD_CHANGED,
        title="First-login password change completed",
        message=f"{current_user.email} completed the required first-login password change.",
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

    return {"message": "Password changed successfully."}