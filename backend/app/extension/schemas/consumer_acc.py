from pydantic import BaseModel, EmailStr, field_validator

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

class UpdateUsername(BaseModel):
    username: str

class ChangePendingUsername(BaseModel):
    email: EmailStr
    username: str

class DeleteAccountRequest(BaseModel):
    password: str

class RequestOTP(BaseModel):
    email: EmailStr

class VerifyOTP(BaseModel):
    email: EmailStr
    otp_code: str

class GoogleLoginRequest(BaseModel):
    token: str
    
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyResetOtp(BaseModel):
    email: EmailStr
    otp_code: str
    
class ResetPassword(BaseModel):
    email: EmailStr
    reset_token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v