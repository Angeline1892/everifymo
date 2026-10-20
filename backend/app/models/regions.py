# backend/app/models/regions.py
from sqlalchemy import Column, String, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class Region(Base):
    __tablename__ = "regions"

    region_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    
    region_name = Column(String(100), nullable=False)
    region_code = Column(String(20), unique=True, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"),)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())