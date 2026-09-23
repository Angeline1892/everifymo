# backend/app/desktop/routers/auth/sessions.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from app.core.audit import write_audit_log, get_user_region_code
from app.core.constants import AuditAction

from app.database.sessions import get_db
from app.models.user_sessions import UserSession
from app.core.security import hash_refresh_token, create_desktop_access_token, generate_refresh_token
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.users import User


router = APIRouter(prefix="/auth/token", tags=["auth-token"])


@router.post("/refresh")
def refresh_token(payload: dict, db: Session = Depends(get_db), request: Request = None):
    token = payload.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="refresh_token required")

    token_hash = hash_refresh_token(token)

    session = (
        db.query(UserSession)
        .filter(UserSession.refresh_token_hash == token_hash)
        .first()
    )

    if not session or session.is_revoked:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired")

    # Ashanti code starts here
    # A revoked/expired UserSession row isn't the only way access should stop —
    # the account itself may have been suspended or locked since this session
    # was issued. Without this check, a suspended/locked user's refresh token
    # would keep minting fresh access tokens forever, independent of whatever
    # dependencies.py checks on the access-token side.
    user = db.query(User).filter(User.user_id == session.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Account has been suspended.")
    if user.is_locked:
        raise HTTPException(status_code=401, detail="Account is locked.")
    # Ashanti code ends here

    # rotate refresh token
    new_refresh = generate_refresh_token()
    session.refresh_token_hash = hash_refresh_token(new_refresh)
    session.last_used_at = datetime.now(timezone.utc)
    session.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db.commit()

    access_token = create_desktop_access_token({"sub": str(session.user_id), "role": user.role})

    return {"access_token": access_token, "token_type": "bearer", "refresh_token": new_refresh}



@router.post("/revoke")
def revoke_token(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    token = payload.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="refresh_token required")

    token_hash = hash_refresh_token(token)
    session = db.query(UserSession).filter(UserSession.refresh_token_hash == token_hash).first()

    if not session:
        return {"message": "ok"}

    if session.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot revoke another user's session")

    session.is_revoked = True
    db.commit()

    write_audit_log(
        db,
        user=current_user,
        action=AuditAction.LOGOUT,
        target_table="user_sessions",
        target_id=session.session_id,
        target_reference=current_user.email,
        request=request,
        region_code=get_user_region_code(db, current_user),
    )

    return {"message": "ok"}