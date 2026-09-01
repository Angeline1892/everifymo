# backend/app/desktop/services/auth/invite.py
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.users import User
from app.models.account_invitation_tokens import AccountInvitationToken
from app.desktop.services.superadmin_notifications import superadmin_notification_service as notification_service
from app.desktop.schemas.superadmin_notifications.notification_enums import NotificationEventType
from app.core.audit import write_audit_log, get_user_region_code
from app.core.constants import AuditAction


def create_invited_user(db: Session, email: str, region_id, role: str, created_by, request=None):
    db.execute(text("SET app.bypass_rls = 'true'"))

    user = User(
        email=email,
        region_id=region_id,
        role=role,
        created_by=created_by,
    )
    db.add(user)
    db.flush()

    # Capture what we need while the object is still fully populated,
    # before commit() expires its attributes.
    user_id = user.user_id
    user_email = user.email
    user_region_code = get_user_region_code(db, user)

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=2)

    invite = AccountInvitationToken(
        user_id=user_id,
        invite_token=token,
        expires_at=expires,
    )
    db.add(invite)
    db.commit()
    # no db.refresh(user), no user.<anything> reads past this point

    notification_service.create_notification_for_all_superadmins(
        db=db,
        event_type=NotificationEventType.PERSONNEL_INVITED,
        title="New personnel invited",
        message=f"{user_email} was invited as new {role.replace('_', ' ')}.",
        related_user_id=user_id,
    )

    inviting_admin = db.query(User).filter(User.user_id == created_by).first()
    write_audit_log(
        db,
        user=inviting_admin,
        action=AuditAction.INVITE_PERSONNEL,
        target_table="users",
        target_id=user_id,
        target_reference=user_email,
        old_value=None,
        new_value={"email": user_email, "role": role, "status": "invited"},
        request=request,
        region_code=user_region_code,
        user_role_override="superadmin",
    )

    return user_id, token