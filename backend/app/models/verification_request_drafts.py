from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class VerificationRequestDraft(Base):
    __tablename__ = "verification_request_drafts"

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
    complaint_id = Column(
        UUID(as_uuid=True),
        ForeignKey("complaints.complaint_id", ondelete="RESTRICT"),
        nullable=False,
    )
    draft_status = Column(String(50), nullable=False, server_default=text("'draft'"))

    # Officer-editable fields — the only three fields stored here
    product_code = Column(String(100), nullable=True)
    priority = Column(String(50), nullable=True)
    notes_to_fda = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(
            "draft_status IN ('incomplete', 'draft')",
            name="ck_verification_request_drafts_status",
        ),
        CheckConstraint(
            "priority IS NULL OR priority IN ('standard', 'high', 'urgent', 'critical')",
            name="ck_verification_request_drafts_priority",
        ),
    )