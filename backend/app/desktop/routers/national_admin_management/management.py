# backend/app/desktop/routers/national_admin_management/management.py
import uuid
from fastapi import APIRouter, Depends, BackgroundTasks, Request, HTTPException
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.models.users import User
from app.models.account_invitation_tokens import AccountInvitationToken
from app.core.constants import Role
from app.core.dependencies import get_current_national_admin
from app.desktop.schemas.account_management.create import CreateNationalAdminRequest
from app.desktop.schemas.account_management.list import AccountListItem, AccountSummary
from app.desktop.services.auth.invite import create_invited_account, activate_account
from app.desktop.services.auth.email import send_national_admin_invite_email, send_national_admin_activation_email
from app.desktop.services.account_status import (
    compute_display_status, suspend_account, reactivate_account, unlock_account,
    resend_invite_link, delete_invited_account,
)

router = APIRouter(prefix="/national-admin-management", tags=["national-admin-management"])


@router.get("", response_model=list[AccountListItem])
def list_national_admins(db: Session = Depends(get_db), current_user: User = Depends(get_current_national_admin)):
    admins = db.query(User).filter(User.role == Role.NATIONAL_ADMIN).all()
    if not admins:
        return []

    tokens = {
        t.user_id: t for t in db.query(AccountInvitationToken)
        .filter(AccountInvitationToken.user_id.in_([a.user_id for a in admins]))
        .order_by(AccountInvitationToken.created_at.asc()).all()
    }
    return [
        AccountListItem(
            user_id=a.user_id, first_name=a.first_name, middle_name=a.middle_name,
            last_name=a.last_name, email=a.email,
            invitation_date=tokens.get(a.user_id).created_at if tokens.get(a.user_id) else None,
            expiration_date=tokens.get(a.user_id).expires_at if tokens.get(a.user_id) else None,
            status=compute_display_status(a, tokens.get(a.user_id)), is_locked=a.is_locked,
        ) for a in admins
    ]


@router.get("/summary", response_model=AccountSummary)
def national_admin_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_national_admin)):
    base = db.query(User).filter(User.role == Role.NATIONAL_ADMIN)
    total = base.count()
    active = base.filter(User.status == "active", User.is_active == True).count()
    suspended = base.filter(User.status == "active", User.is_active == False).count()
    return AccountSummary(total=total, active=active, suspended=suspended)


@router.post("", status_code=201)
async def create_national_admin(
    payload: CreateNationalAdminRequest, background_tasks: BackgroundTasks, http_request: Request,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_national_admin),
):
    user_id, token = create_invited_account(
        db, email=payload.email, role=Role.NATIONAL_ADMIN, created_by=current_user.user_id,
        first_name=payload.first_name, last_name=payload.last_name, region_id=None, request=http_request,
    )
    background_tasks.add_task(send_national_admin_invite_email, payload.email, token)
    return {"message": "Invitation sent", "user_id": str(user_id)}


@router.post("/{user_id}/activate")
async def activate(user_id: uuid.UUID, background_tasks: BackgroundTasks, http_request: Request,
                    db: Session = Depends(get_db), current_user: User = Depends(get_current_national_admin)):
    target_id, target_email = activate_account(db, target_id=user_id, activated_by=current_user, request=http_request)
    target_user = db.query(User).filter(User.user_id == target_id).first()
    full_name = f"{target_user.first_name} {target_user.last_name}".strip() if target_user else target_email
    background_tasks.add_task(send_national_admin_activation_email, target_email, full_name)
    return {"message": "Account activated", "user_id": str(target_id)}


@router.post("/{user_id}/suspend")
async def suspend(user_id: uuid.UUID, http_request: Request,
                   db: Session = Depends(get_db), current_user: User = Depends(get_current_national_admin)):
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot suspend your own account.",
        )
    return {"message": "Account suspended", "user_id": str(suspend_account(db, current_user, user_id, request=http_request))}

@router.post("/{user_id}/reactivate")
async def reactivate(user_id: uuid.UUID, http_request: Request,
                      db: Session = Depends(get_db), current_user: User = Depends(get_current_national_admin)):
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot reactivate your own account.",
        )
    return {"message": "Account reactivated", "user_id": str(reactivate_account(db, current_user, user_id, request=http_request))}


@router.post("/{user_id}/unlock")
async def unlock(user_id: uuid.UUID, http_request: Request,
                  db: Session = Depends(get_db), current_user: User = Depends(get_current_national_admin)):
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot unlock your own account.",
        )
    return {"message": "Account unlocked", "user_id": str(unlock_account(db, current_user, user_id, request=http_request))}


@router.post("/{user_id}/resend-link")
async def resend_link(user_id: uuid.UUID, background_tasks: BackgroundTasks, http_request: Request,
                       db: Session = Depends(get_db), current_user: User = Depends(get_current_national_admin)):
    target_id, target_email, target_role, token = resend_invite_link(db, current_user, user_id, request=http_request)
    background_tasks.add_task(send_national_admin_invite_email, target_email, token)
    return {"message": "New invitation sent", "user_id": str(target_id)}


@router.delete("/{user_id}")
async def delete_account(user_id: uuid.UUID, http_request: Request,
                          db: Session = Depends(get_db), current_user: User = Depends(get_current_national_admin)):
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account.",
        )
    return {"message": "Invitation deleted", "user_id": str(delete_invited_account(db, current_user, user_id, request=http_request))}