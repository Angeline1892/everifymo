# app/core/dependencies.py
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database.sessions import get_db, set_bypass_rls, set_region_context
from app.core.security import decode_access_token
from app.models.users import User


from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database.sessions import get_db, set_bypass_rls, set_region_context
from app.core.security import decode_access_token
from app.models.users import User


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

    if user.role == "superadmin":
        set_bypass_rls(db, True)
    else:
        set_bypass_rls(db, False)
        set_region_context(db, str(user.region_id) if user.region_id else "")

    return user


def get_current_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required.")
    return current_user