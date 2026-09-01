# backend/app/models/audit_logs.py
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.database.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    user_role = Column(String(50), nullable=False)  

    region_id = Column(
        UUID(as_uuid=True),
        ForeignKey("regions.region_id", ondelete="SET NULL"),
        nullable=True,
    )  

    action = Column(String(100), nullable=False)
    target_table = Column(String(100), nullable=True)
    target_id = Column(UUID(as_uuid=True), nullable=True)
    target_reference = Column(String(150), nullable=True)
    region_code = Column(String(20), nullable=True) 

    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)

    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    performed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())