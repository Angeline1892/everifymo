# backend/app/desktop/services/auth/session_service.py
from datetime import datetime, timedelta, timezone

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_refresh_token, hash_refresh_token
from app.models.user_sessions import UserSession
from app.models.users import User


def create_session(db: Session, user: User, request: Request) -> tuple[UserSession, str]:
    """Creates a session row and returns (session, plain_refresh_token)."""
    plain_token = generate_refresh_token()

    session = UserSession(
        user_id=user.user_id,
        refresh_token_hash=hash_refresh_token(plain_token),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return session, plain_token


def revoke_session(db: Session, refresh_token: str) -> bool:
    token_hash = hash_refresh_token(refresh_token)
    session = db.query(UserSession).filter(
        UserSession.refresh_token_hash == token_hash,
        UserSession.is_revoked.is_(False),
    ).first()

    if not session:
        return False

    session.is_revoked = True
    db.commit()
    return True


def get_valid_session(db: Session, refresh_token: str) -> UserSession | None:
    token_hash = hash_refresh_token(refresh_token)
    session = db.query(UserSession).filter(
        UserSession.refresh_token_hash == token_hash,
        UserSession.is_revoked.is_(False),
    ).first()

    if not session:
        return None

    if session.expires_at < datetime.now(timezone.utc):
        return None

    session.last_used_at = datetime.now(timezone.utc)
    db.commit()
    return session