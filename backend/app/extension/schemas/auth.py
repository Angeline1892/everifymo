from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str
    username: str

class TokenData(BaseModel):
    username: str | None = None

