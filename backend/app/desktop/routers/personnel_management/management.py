import uuid
from fastapi import APIRouter, Depends, BackgroundTasks, Request
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.models.users import User
from app.models.regions import Region
from app.models.account_invitation_tokens import AccountInvitationToken
from app.core.constants import Role
from app.core.dependencies import get_current_agency_admin
from app.desktop.schemas.account_management.create import CreatePersonnelRequest, EditPersonnelInfoRequest
from app.desktop.schemas.account_management.list import AccountListItem, AccountSummary
from app.desktop.services.auth.invite import create_invited_account
from app.desktop.services.auth.email import (
    send_personnel_invite_email,
    send_personnel_reset_password_email,
)
from app.desktop.services.account_status import (
    compute_display_status, suspend_account, reactivate_account, unlock_account,
    edit_personnel_info, reset_personnel_password, resend_invite_link, delete_invited_account,
)
from app.desktop.services.account_status.guards import agency_of, assert_employee_id_available

router = APIRouter(prefix="/personnel-management", tags=["personnel-management"])


def _region_name(db: Session, region_id) -> str | None:
    region = db.query(Region).filter(Region.region_id == region_id).first()
    return region.region_name if region else None


@router.get("", response_model=list[AccountListItem])
def list_personnel(db: Session = Depends(get_db), current_user: User = Depends(get_current_agency_admin)):
    personnel_role = Role.FDA_PERSONNEL if current_user.role == Role.FDA_ADMIN else Role.LEA_PERSONNEL
    users = db.query(User).filter(User.role == personnel_role, User.region_id == current_user.region_id).all()
    if not users:
        return []

    tokens = {
        t.user_id: t for t in db.query(AccountInvitationToken)
        .filter(AccountInvitationToken.user_id.in_([u.user_id for u in users]))
        .order_by(AccountInvitationToken.created_at.asc()).all()
    }
    regions = {r.region_id: r.region_name for r in db.query(Region).all()}
    return [
        AccountListItem(
            user_id=u.user_id, first_name=u.first_name, middle_name=u.middle_name, last_name=u.last_name, email=u.email,
            agency="FDA" if u.role == Role.FDA_PERSONNEL else "LEA-CIDG",
            region=regions.get(u.region_id), department=u.department, position=u.position,
            employee_id=u.employee_id, contact_number=u.contact_number,
            invitation_date=tokens.get(u.user_id).created_at if tokens.get(u.user_id) else None,
            expiration_date=tokens.get(u.user_id).expires_at if tokens.get(u.user_id) else None,
            status=compute_display_status(u, tokens.get(u.user_id)), is_locked=u.is_locked,
        ) for u in users
    ]


@router.get("/summary", response_model=AccountSummary)
def personnel_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_agency_admin)):
    personnel_role = Role.FDA_PERSONNEL if current_user.role == Role.FDA_ADMIN else Role.LEA_PERSONNEL
    query = db.query(User).filter(User.role == personnel_role, User.region_id == current_user.region_id)
    total = query.count()
    active = query.filter(User.status == "active", User.is_active == True).count()
    suspended = query.filter(User.status == "active", User.is_active == False).count()
    return AccountSummary(total=total, active=active, suspended=suspended)


@router.post("", status_code=201)
async def create_personnel(
    payload: CreatePersonnelRequest, background_tasks: BackgroundTasks, http_request: Request,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_agency_admin),
):
    assert_employee_id_available(db, payload.employee_id)
    personnel_role = Role.FDA_PERSONNEL if current_user.role == Role.FDA_ADMIN else Role.LEA_PERSONNEL
    user_id, token = create_invited_account(
        db, email=payload.email, role=personnel_role, created_by=current_user.user_id,
        first_name=payload.first_name, last_name=payload.last_name, middle_name=payload.middle_name,
        contact_number=payload.contact_number, employee_id=payload.employee_id,
        position=payload.position, department=payload.department,
        region_id=current_user.region_id, request=http_request,
    )
    background_tasks.add_task(
        send_personnel_invite_email,
        payload.email,
        agency_of(personnel_role),
        _region_name(db, current_user.region_id),
        token,
    )
    return {"message": "Invitation sent", "user_id": str(user_id)}


@router.post("/{user_id}/suspend")
async def suspend(user_id: uuid.UUID, http_request: Request,
                   db: Session = Depends(get_db), current_user: User = Depends(get_current_agency_admin)):
    return {"message": "Account suspended", "user_id": str(suspend_account(db, current_user, user_id, request=http_request))}


@router.post("/{user_id}/reactivate")
async def reactivate(user_id: uuid.UUID, http_request: Request,
                      db: Session = Depends(get_db), current_user: User = Depends(get_current_agency_admin)):
    return {"message": "Account reactivated", "user_id": str(reactivate_account(db, current_user, user_id, request=http_request))}


@router.post("/{user_id}/unlock")
async def unlock(user_id: uuid.UUID, http_request: Request,
                  db: Session = Depends(get_db), current_user: User = Depends(get_current_agency_admin)):
    return {"message": "Account unlocked", "user_id": str(unlock_account(db, current_user, user_id, request=http_request))}


@router.patch("/{user_id}")
async def edit_personnel(user_id: uuid.UUID, payload: EditPersonnelInfoRequest, http_request: Request,
                          db: Session = Depends(get_db), current_user: User = Depends(get_current_agency_admin)):
    updates = payload.model_dump(exclude_unset=True)
    return {"message": "Personnel info updated", "user_id": str(edit_personnel_info(db, current_user, user_id, updates, request=http_request))}


@router.post("/{user_id}/reset-password")
async def reset_password(user_id: uuid.UUID, background_tasks: BackgroundTasks, http_request: Request,
                          db: Session = Depends(get_db), current_user: User = Depends(get_current_agency_admin)):
    target_id, target_email, full_name, temp_password = reset_personnel_password(db, current_user, user_id, request=http_request)
    background_tasks.add_task(send_personnel_reset_password_email, target_email, full_name, temp_password)
    return {"message": "Temporary password sent", "user_id": str(target_id)}


@router.post("/{user_id}/resend-link")
async def resend_link(user_id: uuid.UUID, background_tasks: BackgroundTasks, http_request: Request,
                       db: Session = Depends(get_db), current_user: User = Depends(get_current_agency_admin)):
    target_id, target_email, target_role, token = resend_invite_link(db, current_user, user_id, request=http_request)
    background_tasks.add_task(
        send_personnel_invite_email,
        target_email,
        agency_of(target_role),
        _region_name(db, current_user.region_id),
        token,
    )
    return {"message": "New invitation sent", "user_id": str(target_id)}


@router.delete("/{user_id}")
async def delete_account(user_id: uuid.UUID, http_request: Request,
                          db: Session = Depends(get_db), current_user: User = Depends(get_current_agency_admin)):
    return {"message": "Invitation deleted", "user_id": str(delete_invited_account(db, current_user, user_id, request=http_request))}