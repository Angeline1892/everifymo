# backend/app/desktop/routers/auth/registration.py
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone, timedelta

from app.database.sessions import get_db, set_bypass_rls
from app.models.users import User
from app.models.account_invitation_tokens import AccountInvitationToken
from app.models.regions import Region

from app.desktop.schemas.auth.registration import (
    ValidateTokenResponse, TokenStatus,
    RegistrationCompleteRequest, RegistrationCompleteResponse,
    ResendInviteRequest, ResendInviteResponse,
    RequestResendRequest, RequestResendResponse,
)

from app.core.constants import UserStatus, Role, AuditAction
from app.core.security import hash_password
from app.desktop.services.account_status.guards import agency_of
from app.desktop.services.auth.email import (
    send_personnel_invite_email,
    send_admin_invite_email,
    send_national_admin_invite_email,
)

import secrets

from app.desktop.schemas.auth.registration import RequestResendRequest, RequestResendResponse

from app.desktop.services.admin_notifications import admin_notification_service as notification_service
from app.desktop.schemas.admin_notifications.notification_enums import NotificationEventType
from app.core.audit import write_audit_log, get_user_region_code

router = APIRouter(prefix="/registration", tags=["Registration"])


@router.get("/validate/{invite_token}", response_model=ValidateTokenResponse)
def validate_token(invite_token: str, db: Session = Depends(get_db)):
    set_bypass_rls(db, True)

    token_row = db.query(AccountInvitationToken).filter(
        AccountInvitationToken.invite_token == invite_token
    ).first()

    if not token_row:
        return ValidateTokenResponse(status=TokenStatus.invalid, message="This invitation link is not valid.")

    user_row = db.query(User).filter(User.user_id == token_row.user_id).first()
    role = user_row.role if user_row else None

    if token_row.used_at is not None:
        return ValidateTokenResponse(
            status=TokenStatus.used,
            message="This invitation has already been used to complete registration.",
            role=role,
        )

    if token_row.expires_at < datetime.now(timezone.utc):
        return ValidateTokenResponse(
            status=TokenStatus.expired,
            message="This invitation link has expired. Please request a new one.",
            role=role,
            resend_already_requested=token_row.resend_requested_at is not None,
        )

    region_row = db.query(Region).filter(Region.region_id == user_row.region_id).first() if user_row and user_row.region_id else None

    return ValidateTokenResponse(
        status=TokenStatus.valid,
        email=user_row.email,
        role=role,
        region_id=user_row.region_id,
        region_name=region_row.region_name if region_row else None,
    )


@router.post("/complete", response_model=RegistrationCompleteResponse)
def complete_registration(data: RegistrationCompleteRequest, http_request: Request, db: Session = Depends(get_db)):
    set_bypass_rls(db, True)

    token_row = db.query(AccountInvitationToken).filter(
        AccountInvitationToken.invite_token == data.invite_token
    ).first()

    if not token_row:
        raise HTTPException(status_code=404, detail="Invalid invitation token.")

    if token_row.used_at is not None:
        raise HTTPException(status_code=409, detail="This invitation has already been used to complete registration.")

    if token_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This invitation has expired.")

    user_row = db.query(User).filter(User.user_id == token_row.user_id).first()
    if not user_row:
        raise HTTPException(status_code=404, detail="Associated account not found.")

    # Profile fields (name, position, employee_id, contact_number, department)
    # are no longer collected here — the admin who created this account already
    # supplied them. This endpoint's only job is setting the password.
    user_row.password_hash = hash_password(data.password)
    user_row.force_password_change = False  # they chose it themselves

    # Personnel skip pending-approval entirely and go straight to active —
    # their profile was already fully vetted/entered by their Agency Admin
    # at invite time, so there's no separate approval step for them.
    # Admin (fda/lea) and National Admin still require a fellow
    # admin/national admin to activate them afterward.
    is_personnel = user_row.role in Role.PERSONNEL_ROLES
    user_row.status = UserStatus.ACTIVE if is_personnel else UserStatus.PENDING_APPROVAL

    token_row.used_at = datetime.now(timezone.utc)

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="A record with these details already exists.")

    user_id = user_row.user_id
    user_email = user_row.email
    user_role = user_row.role
    region_code = get_user_region_code(db, user_row) if user_row.region_id else None

    if is_personnel:
        notification_service.notify_self_service_account_event(
            db=db, target=user_row,
            event_type=NotificationEventType.ACCOUNT_ACTIVATED,
            title="Personnel registration completed",
            message=f"{user_email} completed registration and their account is now active.",
        )

        write_audit_log(
            db,
            user=user_row,
            action=AuditAction.PERSONNEL_SELF_ACTIVATE,
            target_table="users",
            target_id=user_id,
            target_reference=user_email,
            old_value={"status": "invited"},
            new_value={"status": "active"},
            request=http_request,
            region_code=region_code,
        )
    else:
        notification_service.notify_self_service_account_event(
            db=db, target=user_row,
            event_type=NotificationEventType.ACCOUNT_PENDING_APPROVAL,
            title="Registration completed - awaiting approval",
            message=f"{user_email} completed registration and is now awaiting approval.",
        )

        write_audit_log(
            db,
            user=user_row,
            action=_pending_approval_action_for_role(user_role),
            target_table="users",
            target_id=user_id,
            target_reference=user_email,
            request=http_request,
            region_code=region_code,
        )

    return RegistrationCompleteResponse(
        message="Registration submitted successfully.",
        status=user_row.status,
    )


@router.post("/resend-invite", response_model=ResendInviteResponse)
def resend_invite(data: ResendInviteRequest, background_tasks: BackgroundTasks, http_request: Request, db: Session = Depends(get_db)):
    set_bypass_rls(db, True)

    old_token_row = db.query(AccountInvitationToken).filter(
        AccountInvitationToken.invite_token == data.invite_token
    ).first()

    if not old_token_row:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    if old_token_row.used_at is not None:
        raise HTTPException(status_code=409, detail="This invitation was already used to complete registration.")

    if old_token_row.expires_at > datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This invitation has not expired yet.")

    new_token = AccountInvitationToken(
        user_id=old_token_row.user_id,
        invite_token=secrets.token_urlsafe(32),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
    )
    db.add(new_token)
    db.commit()

    user_row = db.query(User).filter(User.user_id == old_token_row.user_id).first()

    if user_row:
        if user_row.role == Role.NATIONAL_ADMIN:
            background_tasks.add_task(send_national_admin_invite_email, user_row.email, new_token.invite_token)
        else:
            region_row = db.query(Region).filter(Region.region_id == user_row.region_id).first() if user_row.region_id else None
            region_name = region_row.region_name if region_row else None
            agency_name = agency_of(user_row.role)
            if user_row.role in Role.ADMIN_ROLES:
                background_tasks.add_task(send_admin_invite_email, user_row.email, agency_name, region_name, new_token.invite_token)
            else:
                background_tasks.add_task(send_personnel_invite_email, user_row.email, agency_name, region_name, new_token.invite_token)

    notification_service.notify_self_service_account_event(
        db=db, target=user_row,
        event_type=NotificationEventType.RESEND_LINK_REQUESTED,
        title="Invitation link resent",
        message=f"{user_row.email if user_row else 'A user'} generated a new invitation link after theirs expired.",
    )

    if user_row:
        write_audit_log(
            db,
            user=user_row,
            action=_request_invite_action_for_role(user_row.role),
            target_table="account_invitation_tokens",
            target_id=user_row.user_id,
            target_reference=user_row.email,
            request=http_request,
            region_code=get_user_region_code(db, user_row) if user_row.region_id else None,
        )

    return ResendInviteResponse(message="A new invitation has been generated.")


@router.post("/request-resend", response_model=RequestResendResponse)
def request_resend(data: RequestResendRequest, http_request: Request, db: Session = Depends(get_db)):
    set_bypass_rls(db, True)

    token_row = db.query(AccountInvitationToken).filter(
        AccountInvitationToken.invite_token == data.invite_token
    ).first()

    if not token_row:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    if token_row.used_at is not None:
        raise HTTPException(status_code=409, detail="This invitation was already used.")

    if token_row.expires_at > datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This invitation has not expired yet.")

    if token_row.resend_requested_at is not None:
        raise HTTPException(status_code=409, detail="A resend has already been requested for this invitation.")

    token_row.resend_requested_at = datetime.now(timezone.utc)
    db.commit()

    user_row = db.query(User).filter(User.user_id == token_row.user_id).first()
    notification_service.notify_self_service_account_event(
        db=db, target=user_row,
        event_type=NotificationEventType.RESEND_LINK_REQUESTED,
        title="Resend requested",
        message=f"{user_row.email if user_row else 'A user'} requested a new invitation link.",
    )

    if user_row:
        write_audit_log(
            db,
            user=user_row,
            action=_request_invite_action_for_role(user_row.role),
            target_table="account_invitation_tokens",
            target_id=user_row.user_id,
            target_reference=user_row.email,
            request=http_request,
            region_code=get_user_region_code(db, user_row) if user_row.region_id else None,
        )

    return RequestResendResponse(message="Your request has been sent to the administrator.")


# --- role-aware audit action helpers (mirrors the ones in services/auth/invite.py) ---
# NOTE: personnel no longer goes through _pending_approval_action_for_role at all
# (see complete_registration above) — this helper now only ever gets called for
# admin/national_admin, but the personnel branch is left in place rather than
# removed, since request_resend/resend_invite still cover all three roles via
# _request_invite_action_for_role below and share this file's pattern.

def _pending_approval_action_for_role(role: str) -> str:
    from app.core.constants import AuditAction, Role
    if role == Role.NATIONAL_ADMIN:
        return AuditAction.PENDING_NATIONAL_ADMIN_ACCOUNT
    if role in Role.ADMIN_ROLES:
        return AuditAction.PENDING_REGIONAL_ADMIN_ACCOUNT
    # Personnel no longer reach this helper (see complete_registration —
    # personnel go straight to ACTIVE, not PENDING_APPROVAL), so this
    # branch should be unreachable in practice. Left in for safety in
    # case something upstream changes.
    raise ValueError(f"Unexpected role reached _pending_approval_action_for_role: {role}")


def _request_invite_action_for_role(role: str) -> str:
    from app.core.constants import AuditAction, Role
    if role == Role.NATIONAL_ADMIN:
        return AuditAction.NATIONAL_ADMIN_REQUEST_INVITE
    if role in Role.ADMIN_ROLES:
        return AuditAction.REGIONAL_ADMIN_REQUEST_INVITE
    return AuditAction.PERSONNEL_REQUEST_INVITE