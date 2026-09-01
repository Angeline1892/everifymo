# backend/app/desktop/routers/auth/invite.py
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.sessions import get_db
from app.models.users import User
from app.desktop.schemas.auth.invite import InvitePersonnelRequest
from app.desktop.services.auth.invite import create_invited_user
from app.desktop.services.auth.email import send_invite_email
from app.core.dependencies import get_current_superadmin

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.post("/invite", status_code=201)
async def invite_personnel(
    payload: InvitePersonnelRequest,
    background_tasks: BackgroundTasks,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    existing = db.query(User).filter_by(email=payload.email).first()
    if existing:
        raise HTTPException(400, "A user with this email already exists.")

    db_role = {
        "FDA": "fda_personnel",
        "LEA-CIDG": "lea_personnel",
    }.get(payload.role, payload.role)

    user_id, token = create_invited_user(
        db, payload.email, payload.region_id, db_role,
        created_by=current_user.user_id, request=http_request,
    )

    # use payload.email, not user.email — avoids touching the expired ORM object
    background_tasks.add_task(send_invite_email, payload.email, payload.role, token)

    return {"message": "Registration link sent", "user_id": str(user_id)}