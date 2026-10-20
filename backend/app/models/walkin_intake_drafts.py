from sqlalchemy import (
    Column, String, Text, Date, DateTime, Numeric,
    ForeignKey, CheckConstraint, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class WalkinIntakeDraft(Base):
    __tablename__ = "walkin_intake_drafts"

    draft_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # Identifiers & ownership
    saved_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
    )
    region_id = Column(
        UUID(as_uuid=True),
        ForeignKey("regions.region_id", ondelete="RESTRICT"),
        nullable=False,
    )
    draft_status = Column(String(50), nullable=False, server_default=text("'draft'"))

    # Complainant details — all nullable, officer may save mid-form
    full_name = Column(String(255), nullable=True)
    contact_number = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    id_type = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)

    # Reported product — all nullable
    product_name = Column(Text, nullable=True)
    manufacturer = Column(String(255), nullable=True)
    product_category = Column(String(100), nullable=True)
    place_of_purchase = Column(Text, nullable=True)
    date_of_purchase = Column(Date, nullable=True)
    amount_paid = Column(Numeric(10, 2), nullable=True)
    nature_of_complaint = Column(Text, nullable=True)

    # NOTE: case_reference intentionally removed from this table.
    # Team decision (2026-07): case_reference is generated only once,
    # at complaints insert time, not at draft save time — avoids
    # having two separate generation points that could drift.

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(
            "draft_status IN ('incomplete', 'draft')",
            name="ck_walkin_intake_drafts_status",
        ),
        CheckConstraint(
            "id_type IS NULL OR id_type IN "
            "('philsys', 'passport', 'drivers_license', 'other')",
            name="ck_walkin_intake_drafts_id_type",
        ),
    )