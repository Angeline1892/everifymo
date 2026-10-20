# backend/app/desktop/schemas/auth/sessions.py  
from pydantic import BaseModel, constr


class RefreshRequest(BaseModel):
    refresh_token: str


class RevokeRequest(BaseModel):
    refresh_token: str
