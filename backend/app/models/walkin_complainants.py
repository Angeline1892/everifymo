from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class WalkinComplainant(Base):
    __tablename__ = "walkin_complainants"

    complainant_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    full_name = Column(String(255), nullable=True)
    contact_number = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    id_type = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
    )
    updated_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(
            "id_type IN ('philsys', 'passport', 'drivers_license', 'other')",
            name="ck_walkin_complainants_id_type",
        ),
    )