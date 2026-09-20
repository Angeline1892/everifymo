# backend/app/desktop/routers/audit_logs/audit_logs.py
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from fastapi import HTTPException
from app.database.sessions import get_db
from app.core.dependencies import get_current_national_admin, get_current_admin_or_national_admin
from app.core.constants import Role
from app.core.audit import get_user_region_code
from app.desktop.schemas.audit_logs.audit_logs import AuditLogListResponse, AuditLogItem
from app.desktop.services.audit_logs.audit_logs_service import get_fda_audit_logs, get_national_admin_audit_logs, get_lea_audit_logs, get_system_audit_logs
router = APIRouter(prefix="/admin/audit-logs", tags=["audit-logs"])
def derive_agency(user_role: str) -> str:
    if user_role == "system":
        return "System"
    if user_role in ("fda_personnel", "fda_admin"):
        return "FDA"
    if user_role in ("lea_personnel", "lea_admin"):
        return "LEA-CIDG"
    if user_role == "national_admin":
        return "National Admin"
    return "System"

@router.get("/fda", response_model=AuditLogListResponse)
def list_fda_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    action: str | None = None,
    region_code: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_or_national_admin),
):
    if current_user.role == Role.LEA_ADMIN:
        raise HTTPException(status_code=403, detail="You do not have access to FDA audit logs.")
    if current_user.role == Role.FDA_ADMIN:
        # Regional Admins are hard-scoped to their own region — override
        # whatever region_code the client sent, so a Regional Admin can
        # never accidentally (or deliberately) view another region's logs.
        region_code = get_user_region_code(db, current_user)

    rows, total = get_fda_audit_logs(db, page, limit, action, region_code, date_from, date_to, search)

    items = [
        AuditLogItem(
            log_id=log.log_id,
            timestamp=log.performed_at,
            user_id=log.user_id,
            user_email=user.email if user else None,
            user_name=(
                f"{user.first_name or ''} {user.last_name or ''}".strip() or None
            ) if user else None,
            user_role=log.user_role,
            agency=derive_agency(log.user_role),
            region_code=log.region_code,
            action=log.action,
            target_table=log.target_table,
            target_reference=log.target_reference,
            target_id=log.target_id,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            old_value=log.old_value,
            new_value=log.new_value,
        )
        for log, user in rows
    ]

    total_pages = max(1, -(-total // limit))
    return AuditLogListResponse(items=items, total=total, page=page, limit=limit, total_pages=total_pages)

@router.get("/lea", response_model=AuditLogListResponse)
def list_lea_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    action: str | None = None,
    region_code: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_or_national_admin),
):
    if current_user.role == Role.FDA_ADMIN:
        raise HTTPException(status_code=403, detail="You do not have access to LEA-CIDG audit logs.")
    if current_user.role == Role.LEA_ADMIN:
        region_code = get_user_region_code(db, current_user)

    rows, total = get_lea_audit_logs(db, page, limit, action, region_code, date_from, date_to, search)

    items = [
        AuditLogItem(
            log_id=log.log_id,
            timestamp=log.performed_at,
            user_id=log.user_id,
            user_email=user.email if user else None,
            user_name=(
                f"{user.first_name or ''} {user.last_name or ''}".strip() or None
            ) if user else None,
            user_role=log.user_role,
            agency=derive_agency(log.user_role),
            region_code=log.region_code,
            action=log.action,
            target_table=log.target_table,
            target_reference=log.target_reference,
            target_id=log.target_id,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            old_value=log.old_value,
            new_value=log.new_value,
        )
        for log, user in rows
    ]

    total_pages = max(1, -(-total // limit))
    return AuditLogListResponse(items=items, total=total, page=page, limit=limit, total_pages=total_pages)

@router.get("/national-admin", response_model=AuditLogListResponse)
def list_national_admin_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    action: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_national_admin),
):
    rows, total = get_national_admin_audit_logs(db, page, limit, action, date_from, date_to, search)

    items = [
        AuditLogItem(
            log_id=log.log_id,
            timestamp=log.performed_at,
            user_id=log.user_id,
            user_email=user.email if user else None,
            user_name=(
                f"{user.first_name or ''} {user.last_name or ''}".strip() or None
            ) if user else None,
            user_role=log.user_role,
            agency=derive_agency(log.user_role),
            region_code=log.region_code,
            action=log.action,
            target_table=log.target_table,
            target_reference=log.target_reference,
            target_id=log.target_id,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            old_value=log.old_value,
            new_value=log.new_value,
        )
        for log, user in rows
    ]

    total_pages = max(1, -(-total // limit))
    return AuditLogListResponse(items=items, total=total, page=page, limit=limit, total_pages=total_pages)


@router.get("/system", response_model=AuditLogListResponse)
def list_system_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    action: str | None = None,
    region_code: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_national_admin),
):
    rows, total = get_system_audit_logs(db, page, limit, action, region_code, date_from, date_to, search)

    items = [
        AuditLogItem(
            log_id=log.log_id,
            timestamp=log.performed_at,
            user_id=log.user_id,
            user_email=user.email if user else None,
            user_name=(
                f"{user.first_name or ''} {user.last_name or ''}".strip() or None
            ) if user else None,
            user_role=log.user_role,
            agency=derive_agency(log.user_role),
            region_code=log.region_code,
            action=log.action,
            target_table=log.target_table,
            target_reference=log.target_reference,
            target_id=log.target_id,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            old_value=log.old_value,
            new_value=log.new_value,
        )
        for log, user in rows
    ]

    total_pages = max(1, -(-total // limit))
    return AuditLogListResponse(items=items, total=total, page=page, limit=limit, total_pages=total_pages)