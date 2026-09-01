from sqlalchemy import Column, Integer, Boolean, text, ForeignKey, Text, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base

class ConsumerOTPToken(Base):
    __tablename__ = "consumer_otp_tokens"

    otp_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    consumer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("consumer_account_table.consumer_id", ondelete="CASCADE"),
        nullable=False,
    )

    otp_hash = Column(Text, nullable=False)
    purpose = Column(String(30), nullable=False)
    attempt_count = Column(Integer, nullable=False, default=0, server_default=text("0"))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, nullable=False, server_default=text("false"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())