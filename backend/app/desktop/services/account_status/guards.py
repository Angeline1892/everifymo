# backend/app/desktop/services/account_status/guards.py
from sqlalchemy.orm import Session
from fastapi import HTTPException


from app.models.users import User
from app.core.constants import Role, AuditAction


def agency_of(role: str) -> str | None:
    if role in (Role.FDA_ADMIN, Role.FDA_PERSONNEL):
        return "FDA"
    if role in (Role.LEA_ADMIN, Role.LEA_PERSONNEL):
        return "LEA-CIDG"
    return None


def assert_same_agency_and_region(db: Session, actor: User, target: User):
    if actor.role == Role.NATIONAL_ADMIN:
        # National Admin has unrestricted reach over other National Admins
        # (that's a separate peer-management flow, unchanged here). For
        # Interagency Admin targets, National Admin may act on them ONLY
        # if a National Admin (any of them) originally created the
        # account. Agency Admins invited by a FELLOW Agency Admin
        # (by-fellow-admin path) are out of National Admin's reach
        # entirely — view-only in the frontend; this 403 is the real
        # enforcement since the API can be called directly.
        if target.role in Role.ADMIN_ROLES:
            creator = (
                db.query(User).filter(User.user_id == target.created_by).first()
                if target.created_by else None
            )
            created_by_national_admin = creator is not None and creator.role == Role.NATIONAL_ADMIN
            if not created_by_national_admin:
                raise HTTPException(
                    status_code=403,
                    detail="You can only manage interagency admin accounts that were added by a National Admin.",
                )
        return
    if actor.region_id != target.region_id or agency_of(actor.role) != agency_of(target.role):
        raise HTTPException(status_code=403, detail="You can only manage accounts in your own agency and region.")


def assert_not_self(actor: User, target: User):
    if actor.user_id == target.user_id:
        raise HTTPException(status_code=400, detail="You cannot perform this action on your own account.")


def get_target(db: Session, user_id) -> User:
    target = db.query(User).filter(User.user_id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Account not found.")
    return target


# Maps (role, verb) -> the correct AuditAction constant, so every action
# function can log correctly for personnel/admin/national_admin without
# repeating a role-check ladder in each one.
#
# National Admin reuses the old SUPERADMIN_* constants — national_admin is
# a 1:1 successor to superadmin, so no new NATIONAL_ADMIN_* constants were
# added (same call made in registration.py's audit helpers).
_ACTION_TABLE = {
    Role.NATIONAL_ADMIN: {
        "SUSPEND": AuditAction.SUSPEND_SUPERADMIN_ACCOUNT,
        "REACTIVATE": AuditAction.REACTIVATE_SUPERADMIN_ACCOUNT,
        "UNLOCK": AuditAction.UNLOCK_SUPERADMIN_ACCOUNT,
        "DELETE": AuditAction.DELETE_SUPERADMIN_ACCOUNT,
        "INVITE_RESENT": AuditAction.INVITE_SUPERADMIN_RESENT,
    },
    "ADMIN": {
        "SUSPEND": AuditAction.SUSPEND_ADMIN_ACCOUNT,
        "REACTIVATE": AuditAction.REACTIVATE_ADMIN_ACCOUNT,
        "UNLOCK": AuditAction.UNLOCK_ADMIN_ACCOUNT,
        "DELETE": AuditAction.DELETE_ADMIN_ACCOUNT,
        "INVITE_RESENT": AuditAction.INVITE_ADMIN_RESENT,
    },
    "PERSONNEL": {
        "SUSPEND": AuditAction.SUSPEND_PERSONNEL_ACCOUNT,
        "REACTIVATE": AuditAction.REACTIVATE_PERSONNEL_ACCOUNT,
        "UNLOCK": AuditAction.UNLOCK_PERSONNEL_ACCOUNT,
        "DELETE": AuditAction.DELETE_PERSONNEL_ACCOUNT,
        "INVITE_RESENT": AuditAction.INVITE_PERSONNEL_RESENT,
        "EDIT_INFO": AuditAction.EDIT_PERSONNEL_INFO,
        "RESET_PASSWORD": AuditAction.RESET_PERSONNEL_PASSWORD,
    },
}


def action_for_role(role: str, verb: str) -> str:
    if role == Role.NATIONAL_ADMIN:
        return _ACTION_TABLE[Role.NATIONAL_ADMIN][verb]
    if role in Role.ADMIN_ROLES:
        return _ACTION_TABLE["ADMIN"][verb]
    return _ACTION_TABLE["PERSONNEL"][verb]


def assert_employee_id_available(db: Session, employee_id: str | None, exclude_user_id=None):
    """Raises 400 if employee_id is already taken by another user.
    Call this on every account-creation path that accepts employee_id,
    and on edit, so the rule is enforced in exactly one place."""
    if not employee_id:
        return
    query = db.query(User).filter(User.employee_id == employee_id)
    if exclude_user_id is not None:
        query = query.filter(User.user_id != exclude_user_id)
    if query.first():
        raise HTTPException(status_code=400, detail="This Employee ID is already in use.")


def get_agency_admins_for(db: Session, target: User) -> list[User]:
    """Returns all Admin-role users (FDA or LEA) in the same region and same
    agency as `target`. Used to scope notifications/actions to the admins
    responsible for a given personnel account — e.g. the 'Notify Admin to
    Reset Password' button, which must not broadcast to all national admins.

    Deliberately excludes National Admins: per the current role model,
    National Admin does not manage Personnel directly — that's Admin's job,
    scoped to region + agency.
    """
    if target.region_id is None:
        return []

    target_agency = agency_of(target.role)
    if target_agency is None:
        return []

    candidates = (
        db.query(User)
        .filter(User.role.in_(Role.ADMIN_ROLES), User.region_id == target.region_id)
        .all()
    )
    return [u for u in candidates if agency_of(u.role) == target_agency]