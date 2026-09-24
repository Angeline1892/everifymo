from sqlalchemy import Column, String, Text, DateTime, Integer, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy import Index

from app.database.base import Base

class ConsumerAccount(Base):
    __tablename__ = 'consumer_account_table'

    consumer_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    consumer_type = Column(String(50), nullable=False)

    username = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False)
   
    password_hash = Column(Text, nullable=False)
    google_id = Column(String(255), unique=True, nullable=True)
    auth_provider = Column(String(20), nullable=True)

    is_verified = Column(Boolean, nullable=False, server_default=text("false"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
   
    email_verification_token_hash = Column(Text, nullable=True)
    email_verification_expires_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    last_login_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        Index(
            "consumer_account_username_verified_uidx",
            "username",
            unique=True,
            postgresql_where=text("is_verified = true"),
        ),
        Index(
            "consumer_account_email_verified_uidx",
            "email",
            unique=True,
            postgresql_where=text("is_verified = true"),
        ),
    )

