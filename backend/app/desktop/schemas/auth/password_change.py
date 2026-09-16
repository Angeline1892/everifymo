
from pydantic import BaseModel, field_validator
from app.core.security import validate_password_strength

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)