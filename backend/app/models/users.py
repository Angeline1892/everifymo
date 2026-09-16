# backend/app/models/users.py
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, text, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class User(Base):                    
    __tablename__ = "users"           

    user_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"), 
    )

    first_name = Column(String(100), nullable=True)  
    middle_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)    
    employee_id = Column(String(50), unique=True, nullable=True)
    email = Column(String(255), unique=True, nullable=False) 
    password_hash = Column(Text, nullable=True)         
    contact_number = Column(String(20), nullable=True)
    department = Column(String(150), nullable=True)
    position = Column(String(150), nullable=True)
    role = Column(String(50), nullable=False)           

    region_id = Column(
    UUID(as_uuid=True),
    ForeignKey("regions.region_id", ondelete="RESTRICT"),
    nullable=True,
    )

    status = Column(String(20), nullable=False, server_default=text("'invited'")) 

    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    is_locked = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    failed_login_attempts = Column(Integer, nullable=False, default=0, server_default=text("0"))  
    failed_otp_attempts = Column(Integer, nullable=False, default=0, server_default=text("0"))
    locked_until = Column(DateTime(timezone=True), nullable=True, default=None)
    force_password_change = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    last_login = Column(DateTime(timezone=True), nullable=True)

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"), 
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
