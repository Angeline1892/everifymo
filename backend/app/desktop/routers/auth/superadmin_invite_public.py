# backend/app/desktop/routers/auth/superadmin_invite_public.py  
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.desktop.services.admin_management.invite import complete_superadmin_registration

router = APIRouter(tags=["superadmin-invite-public"])


class CreatePasswordFromInviteRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        from app.core.security import validate_password_strength as validate_strength
        return validate_strength(v)


@router.post("/auth/password/create-from-invite")
async def create_password_from_invite(
    payload: CreatePasswordFromInviteRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    complete_superadmin_registration(db, payload.token, payload.new_password, request=http_request)
    return {"message": "Password created successfully."}