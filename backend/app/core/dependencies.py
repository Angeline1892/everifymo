# backdend/app/core/dependencies.py
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database.sessions import get_db, set_bypass_rls, set_region_context, set_agency_context
from app.core.security import decode_access_token
from app.core.constants import Role
from app.models.users import User


def _agency_of(role: str) -> str | None:
    if role in (Role.FDA_ADMIN, Role.FDA_PERSONNEL):
        return "FDA"
    if role in (Role.LEA_ADMIN, Role.LEA_PERSONNEL):
        return "LEA-CIDG"
    return None


def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header.")

    token = authorization.removeprefix("Bearer ")

    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user_id = payload.get("sub")
    set_bypass_rls(db, True)  # need to look the user up before we know their role/region
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account has been suspended.")
    if user.is_locked:
        raise HTTPException(status_code=401, detail="Account is locked.")

    if user.role == Role.NATIONAL_ADMIN:
        set_bypass_rls(db, True)
    else:
        set_bypass_rls(db, False)
        set_region_context(db, str(user.region_id) if user.region_id else "")
        set_agency_context(db, _agency_of(user.role))

    return user


def get_current_national_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != Role.NATIONAL_ADMIN:
        raise HTTPException(status_code=403, detail="National Admin access required.")
    return current_user


def get_current_agency_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in Role.ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Agency Admin access required.")
    return current_user


def get_current_admin_or_national_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ({Role.NATIONAL_ADMIN} | Role.ADMIN_ROLES):
        raise HTTPException(status_code=403, detail="Admin or National Admin access required.")
    return current_user


# Backward-compatible alias — remove once admin_management/management.py,
# auth/invite.py, audit_logs.py, superadmin_notifications.py, and
# user_management/management.py have all been migrated or retired.
get_current_superadmin = get_current_national_admin