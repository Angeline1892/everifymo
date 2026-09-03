# backend/app/core/security.py
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import re
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.sessions import get_db
from app.models.consumer_accounts import ConsumerAccount

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_bearer = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_desktop_access_token(data: dict, expires_minutes: int | None = None) -> str:
    if expires_minutes is None:
        expires_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(refresh_token: str) -> str:
    return hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()

def get_current_personnel(token: Annotated[str | None, Depends(oauth2_bearer)]):
    if token is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        role = payload.get("role")
        region_id = payload.get("region_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Could not validate user")
        return {
            "user_id": UUID(user_id),
            "role": role,
            "region_id": UUID(region_id) if region_id else None,
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Unauthorized access")
    
#extension
def authenticate_consumer(email:str, password:str, db:Session):
    user = db.query(ConsumerAccount).filter(ConsumerAccount.email == email).first()
    if not user:
        return False
    if not pwd_context.verify(password, user.password_hash):
        return False
    return user

def create_consumer_access_token(username:str, consumer_id, expires_delta:timedelta):
    encode = {
        "sub": username,
        "id": str(consumer_id)
    }
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({"exp": expires})

    return jwt.encode(encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_user(token: Annotated[str | None, Depends(oauth2_bearer)]):
    if token is None:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        consumer_id: str = payload.get("id")
        if username is None or consumer_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate user",
            )
        return {"username": username, "id": consumer_id}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized access"
        )

def get_current_user_optional(token: Annotated[str | None, Depends(oauth2_bearer)]):
    if token is None:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        consumer_id: str = payload.get("id")
        if username is None or consumer_id is None:
            return None
        return {"username": username, "id": consumer_id}
    except JWTError:
        return None

def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must include at least one uppercase letter.")
    if not re.search(r"[0-9]", v):
        raise ValueError("Password must include at least one number.")
    if not re.search(r"[^A-Za-z0-9]", v):
        raise ValueError("Password must include at least one special character.")
    return v
    