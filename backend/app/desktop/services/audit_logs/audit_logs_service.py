# backend/app/desktop/services/audit_logs/audit_logs_service.py
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_

from app.models.audit_logs import AuditLog
from app.models.users import User

from sqlalchemy import cast, String

def get_fda_audit_logs(
    db: Session,
    page: int,
    limit: int,
    action: str | None = None,
    region_code: str | None = None,
    date_from=None,
    date_to=None,
    search: str | None = None,
):
    query = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.user_id)
        .where(AuditLog.user_role == "fda_personnel")
        .where(AuditLog.action != "PERSONNEL_REQUEST_INVITE")
    )

    if action:
        query = query.where(AuditLog.action == action)
    if region_code:
        query = query.where(AuditLog.region_code == region_code)
    if date_from:
        query = query.where(AuditLog.performed_at >= date_from)
    if date_to:
        query = query.where(AuditLog.performed_at <= date_to)
    if search:
        like = f"%{search}%"
        full_name = User.first_name.concat(" ").concat(User.last_name)
        query = query.where(
            AuditLog.target_reference.ilike(like)
            | AuditLog.target_table.ilike(like)
            | cast(AuditLog.target_id, String).ilike(like)
            | User.first_name.ilike(like)
            | User.last_name.ilike(like)
            | User.email.ilike(like)
            | full_name.ilike(like)
        )

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.execute(
        query.order_by(AuditLog.performed_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    return rows, total

def get_lea_audit_logs(
    db: Session,
    page: int,
    limit: int,
    action: str | None = None,
    region_code: str | None = None,
    date_from=None,
    date_to=None,
    search: str | None = None,
):
    query = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.user_id)
        .where(AuditLog.user_role == "lea_personnel")
        .where(AuditLog.action != "PERSONNEL_REQUEST_INVITE")
    )

    if action:
        query = query.where(AuditLog.action == action)
    if region_code:
        query = query.where(AuditLog.region_code == region_code)
    if date_from:
        query = query.where(AuditLog.performed_at >= date_from)
    if date_to:
        query = query.where(AuditLog.performed_at <= date_to)
    if search:
        like = f"%{search}%"
        full_name = User.first_name.concat(" ").concat(User.last_name)
        query = query.where(
            AuditLog.target_reference.ilike(like)
            | AuditLog.target_table.ilike(like)
            | cast(AuditLog.target_id, String).ilike(like)
            | User.first_name.ilike(like)
            | User.last_name.ilike(like)
            | User.email.ilike(like)
            | full_name.ilike(like)
        )

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.execute(
        query.order_by(AuditLog.performed_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    return rows, total

def get_superadmin_audit_logs(
    db: Session,
    page: int,
    limit: int,
    action: str | None = None,
    date_from=None,
    date_to=None,
    search: str | None = None,
):
    query = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.user_id)
        .where(
            or_(
                AuditLog.user_role == "superadmin",
                AuditLog.action == "PERSONNEL_REQUEST_INVITE",
            )
        )
    )

    if action:
        query = query.where(AuditLog.action == action)
    if date_from:
        query = query.where(AuditLog.performed_at >= date_from)
    if date_to:
        query = query.where(AuditLog.performed_at <= date_to)
    if search:
        like = f"%{search}%"
        full_name = User.first_name.concat(" ").concat(User.last_name)
        query = query.where(
            AuditLog.target_reference.ilike(like)
            | AuditLog.target_table.ilike(like)
            | cast(AuditLog.target_id, String).ilike(like)
            | User.first_name.ilike(like)
            | User.last_name.ilike(like)
            | User.email.ilike(like)
            | full_name.ilike(like)
        )

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.execute(
        query.order_by(AuditLog.performed_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    return rows, total


# System tab: automatic actions only, not manually triggered by a user click.
# Scoped by action code rather than user_role, since these four actions can
# be logged against personnel (fda_personnel/lea_personnel) or superadmin
# accounts alike — the row's user_role stays the real role of whichever
# account the automatic action happened to (Option 1: agency badge should
# show the real agency, not a generic "System" badge, even inside this tab).
SYSTEM_ACTION_CODES = [
    "PERSONNEL_PENDING_APPROVAL",
    "SUPERADMIN_PENDING_APPROVAL",
    "LOCK_PERSONNEL_ACCOUNT",
    "LOCK_SUPERADMIN_ACCOUNT",
]


def get_system_audit_logs(
    db: Session,
    page: int,
    limit: int,
    action: str | None = None,
    region_code: str | None = None,
    date_from=None,
    date_to=None,
    search: str | None = None,
):
    query = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.user_id)
        .where(AuditLog.action.in_(SYSTEM_ACTION_CODES))
    )

    if action:
        query = query.where(AuditLog.action == action)
    if region_code:
        query = query.where(AuditLog.region_code == region_code)
    if date_from:
        query = query.where(AuditLog.performed_at >= date_from)
    if date_to:
        query = query.where(AuditLog.performed_at <= date_to)
    if search:
        like = f"%{search}%"
        full_name = User.first_name.concat(" ").concat(User.last_name)
        query = query.where(
            AuditLog.target_reference.ilike(like)
            | AuditLog.target_table.ilike(like)
            | cast(AuditLog.target_id, String).ilike(like)
            | User.first_name.ilike(like)
            | User.last_name.ilike(like)
            | User.email.ilike(like)
            | full_name.ilike(like)
        )

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.execute(
        query.order_by(AuditLog.performed_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    return rows, total