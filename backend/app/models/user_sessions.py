# backend/app/models/user_sessions.py   
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class UserSession(Base):             
    __tablename__ = "user_sessions"            

    session_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),   
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),   
        nullable=False,                             
    )

    refresh_token_hash = Column(Text, nullable=False)  

    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)             

    is_revoked = Column(Boolean, nullable=False, default=False, server_default=text("false"))  

    expires_at = Column(DateTime(timezone=True), nullable=False)   

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)