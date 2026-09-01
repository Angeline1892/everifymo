from pydantic import BaseModel, EmailStr, Field, field_validator

class CreateConsumerAcc(BaseModel):
    email: EmailStr
    username: str
    password: str
    
    @field_validator("password")
    @classmethod
    def password_strength(cls, v:str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v





