# backend/app/models/personnel_location_logs.py
from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, ForeignKey, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class PersonnelLocationLog(Base):
    __tablename__ = "personnel_location_logs"

    log_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    personnel_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    workspace_location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspace_locations.workspace_location_id", ondelete="SET NULL"),
        nullable=True,
    )
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user_sessions.session_id", ondelete="SET NULL"),
        nullable=True,
    )

    latitude = Column(Numeric(9, 6), nullable=False)
    longitude = Column(Numeric(9, 6), nullable=False)
    distance_meters = Column(Integer, nullable=True)
    is_anomaly = Column(Boolean, nullable=False, server_default=text("false"))
    source = Column(String(20), nullable=False)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("source IN ('gps', 'ip')", name="ck_personnel_location_logs_source"),
    )