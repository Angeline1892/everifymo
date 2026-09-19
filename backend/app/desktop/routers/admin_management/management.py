# backend/app/desktop/routers/admin_management/management.py
import uuid
from fastapi import APIRouter, Depends, BackgroundTasks, Request, HTTPException
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.models.users import User
from app.models.regions import Region
from app.models.account_invitation_tokens import AccountInvitationToken
from app.core.constants import Role
from app.core.dependencies import get_current_national_admin, get_current_agency_admin, get_current_admin_or_national_admin
from app.desktop.schemas.account_management.create import CreateAdminRequest, CreateFellowAdminRequest
from app.desktop.schemas.account_management.list import AccountListItem, AccountSummary
from app.desktop.services.auth.invite import create_invited_account, activate_account
from app.desktop.services.auth.email import send_admin_invite_email, send_admin_activation_email
from app.desktop.services.account_status import (
    compute_display_status, suspend_account, reactivate_account, unlock_account,
    resend_invite_link, delete_invited_account,
)

from app.desktop.services.admin_notifications import admin_notification_service as notification_service
from app.desktop.schemas.admin_notifications.notification_enums import NotificationEventType

from app.desktop.services.account_status.guards import agency_of, assert_employee_id_available

router = APIRouter(prefix="/admin-management", tags=["admin-management"])


def _region_name(db: Session, region_id) -> str | None:
    region = db.query(Region).filter(Region.region_id == region_id).first()
    return region.region_name if region else None


@router.get("", response_model=list[AccountListItem])
def list_admins(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_national_admin)):
    query = db.query(User).filter(User.role.in_(Role.ADMIN_ROLES))
    if current_user.role != Role.NATIONAL_ADMIN:
        query = query.filter(User.role == current_user.role, User.region_id == current_user.region_id)
    admins = query.all()
    if not admins:
        return []

    tokens = {
        t.user_id: t for t in db.query(AccountInvitationToken)
        .filter(AccountInvitationToken.user_id.in_([a.user_id for a in admins]))
        .order_by(AccountInvitationToken.created_at.asc()).all()
    }
    regions = {r.region_id: r.region_name for r in db.query(Region).all()}
    return [
        AccountListItem(
            user_id=a.user_id, first_name=a.first_name, middle_name=a.middle_name,
            last_name=a.last_name, email=a.email,
            agency="FDA" if a.role == Role.FDA_ADMIN else "LEA-CIDG",
            region=regions.get(a.region_id),
            # --- fix: these were previously omitted, so AccountListItem always
            # defaulted them to None even though the schema supports them ---
            department=a.department,
            position=a.position,
            employee_id=a.employee_id,
            contact_number=a.contact_number,
            invitation_date=tokens.get(a.user_id).created_at if tokens.get(a.user_id) else None,
            expiration_date=tokens.get(a.user_id).expires_at if tokens.get(a.user_id) else None,
            status=compute_display_status(a, tokens.get(a.user_id)), is_locked=a.is_locked,
        ) for a in admins
    ]


@router.get("/summary", response_model=AccountSummary)
def admin_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_national_admin)):
    query = db.query(User).filter(User.role.in_(Role.ADMIN_ROLES))
    if current_user.role != Role.NATIONAL_ADMIN:
        query = query.filter(User.role == current_user.role, User.region_id == current_user.region_id)
    total = query.count()
    active = query.filter(User.status == "active", User.is_active == True).count()
    suspended = query.filter(User.status == "active", User.is_active == False).count()
    return AccountSummary(total=total, active=active, suspended=suspended)


@router.post("/by-national-admin", status_code=201)
async def create_admin(
    payload: CreateAdminRequest, background_tasks: BackgroundTasks, http_request: Request,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_national_admin),
):
    assert_employee_id_available(db, payload.employee_id)
    role = {"FDA": Role.FDA_ADMIN, "LEA-CIDG": Role.LEA_ADMIN}[payload.agency]
    user_id, token = create_invited_account(
        db, email=payload.email, role=role, created_by=current_user.user_id,
        first_name=payload.first_name, last_name=payload.last_name, middle_name=payload.middle_name,
        contact_number=payload.contact_number, employee_id=payload.employee_id,
        position=payload.position, department=payload.department,
        region_id=payload.region_id, request=http_request,
    )
    background_tasks.add_task(
        send_admin_invite_email,
        payload.email,
        payload.agency,
        _region_name(db, payload.region_id),
        token,
    )
    return {"message": "Invitation sent", "user_id": str(user_id)}


@router.post("/by-fellow-admin", status_code=201)
async def create_fellow_admin(
    payload: CreateFellowAdminRequest, background_tasks: BackgroundTasks, http_request: Request,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_agency_admin),
):
    assert_employee_id_available(db, payload.employee_id) 
    user_id, token = create_invited_account(
        db, email=payload.email, role=current_user.role, created_by=current_user.user_id,
        first_name=payload.first_name, last_name=payload.last_name, middle_name=payload.middle_name,
        contact_number=payload.contact_number, employee_id=payload.employee_id,
        position=payload.position, department=payload.department,
        region_id=current_user.region_id, request=http_request,
    )
    background_tasks.add_task(
        send_admin_invite_email,
        payload.email,
        agency_of(current_user.role),
        _region_name(db, current_user.region_id),
        token,
    )
    return {"message": "Invitation sent", "user_id": str(user_id)}


@router.post("/{user_id}/activate")
async def activate(user_id: uuid.UUID, background_tasks: BackgroundTasks, http_request: Request,
                    db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_national_admin)):
    target_id, target_email = activate_account(db, target_id=user_id, activated_by=current_user, request=http_request)
    target_user = db.query(User).filter(User.user_id == target_id).first()
    full_name = f"{target_user.first_name} {target_user.last_name}".strip() if target_user else target_email
    agency_name = agency_of(target_user.role) if target_user else None
    region = _region_name(db, target_user.region_id) if target_user else None
    background_tasks.add_task(send_admin_activation_email, target_email, full_name, agency_name, region)
    return {"message": "Account activated", "user_id": str(target_id)}


@router.post("/{user_id}/suspend")
async def suspend(user_id: uuid.UUID, http_request: Request,
                   db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_national_admin)):
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot suspend your own account.",
        )
    return {"message": "Account suspended", "user_id": str(suspend_account(db, current_user, user_id, request=http_request))}


@router.post("/{user_id}/reactivate")
async def reactivate(user_id: uuid.UUID, http_request: Request,
                      db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_national_admin)):
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot reactivate your own account.",
        )
    return {"message": "Account reactivated", "user_id": str(reactivate_account(db, current_user, user_id, request=http_request))}


@router.post("/{user_id}/unlock")
async def unlock(user_id: uuid.UUID, http_request: Request,
                  db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_national_admin)):
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot unlock your own account.",
        )
    return {"message": "Account unlocked", "user_id": str(unlock_account(db, current_user, user_id, request=http_request))}


@router.post("/{user_id}/resend-link")
async def resend_link(user_id: uuid.UUID, background_tasks: BackgroundTasks, http_request: Request,
                       db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_national_admin)):
    target_id, target_email, target_role, token = resend_invite_link(db, current_user, user_id, request=http_request)
    target_user = db.query(User).filter(User.user_id == target_id).first()
    background_tasks.add_task(
        send_admin_invite_email,
        target_email,
        agency_of(target_role),
        _region_name(db, target_user.region_id) if target_user else None,
        token,
    )
    return {"message": "New invitation sent", "user_id": str(target_id)}


@router.delete("/{user_id}")
async def delete_account(user_id: uuid.UUID, http_request: Request,
                          db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_or_national_admin)):
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account.",
        )
    return {"message": "Invitation deleted", "user_id": str(delete_invited_account(db, current_user, user_id, request=http_request))}