from pydantic import BaseModel, EmailStr
from typing import Literal
import uuid

from app.core.constants import Role

class InvitePersonnelRequest(BaseModel):
    email: EmailStr
    region_id: uuid.UUID
    role: Literal[Role.FDA_PERSONNEL, Role.LEA_PERSONNEL]