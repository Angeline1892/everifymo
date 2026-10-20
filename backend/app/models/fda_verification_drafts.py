from sqlalchemy import Column, String, Text, Date, DateTime, ForeignKey, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class FdaVerificationDraft(Base):
    __tablename__ = "fda_verification_drafts"

    draft_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    saved_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
    )
    verification_request_id = Column(
        UUID(as_uuid=True),
        ForeignKey("verification_requests.request_id", ondelete="RESTRICT"),
        nullable=False,
    )

    draft_status = Column(String(50), nullable=False, server_default=text("'draft'"))

    # Officer-editable fields only — everything else (product name,
    # manufacturer, category, source, case reference) is read-only
    # display data reached via verification_request_id.
    draft_verification_status = Column(String(50), nullable=True)
    draft_cpr_number = Column(String(100), nullable=True)
    draft_cpr_expiry = Column(Date, nullable=True)
    draft_response_notes = Column(Text, nullable=True)
    draft_unregistered_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "draft_status IN ('incomplete', 'draft')",
            name="ck_fda_verification_drafts_status",
        ),
        CheckConstraint(
            "draft_verification_status IS NULL OR "
            "draft_verification_status IN ('registered', 'unregistered')",
            name="ck_fda_verification_drafts_verification_status",
        ),
    )