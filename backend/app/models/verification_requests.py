# backend/app/models/verification_requests.py
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint, text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    request_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    complaint_id = Column(
        UUID(as_uuid=True),
        ForeignKey("complaints.complaint_id", ondelete="RESTRICT"),
        nullable=False,
    )
    requested_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
    )

    product_name = Column(Text, nullable=False)
    product_code = Column(String(100), nullable=True)
    complaint_statement = Column(Text, nullable=False)

    verification_request_status = Column(
    String(50), nullable=False
    # No server_default anymore — the app must always pass 'pending'
    # explicitly on insert, since a row is only ever created at the
    # moment it's actually sent to FDA. There's no "default" state
    # that makes sense to fall back to.
    )

    priority = Column(String(20), nullable=False, server_default=text("'standard'"))

    # added for the rejected and registered verification status
    lea_acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    lea_acknowledged_by = Column(
    UUID(as_uuid=True),
    ForeignKey("users.user_id", ondelete="SET NULL"),
    nullable=True,
    ) 

    reminder_sent_at = Column(DateTime(timezone=True), nullable=True)
    reminder_sent_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )

    rejection_reason = Column(Text, nullable=True)
    recalled_at = Column(DateTime(timezone=True), nullable=True)
    recalled_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )

    responded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    response_notes = Column(Text, nullable=True)

    # --- NEW: FDA registration findings, only populated on confirmed_registered ---
    cpr_number = Column(String(100), nullable=True)
    cpr_expiry = Column(Date, nullable=True)
    unregistered_reason = Column(Text, nullable=True)

    requested_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)
    sla_reminder_1_sent_at = Column(DateTime(timezone=True), nullable=True)
    sla_reminder_2_sent_at = Column(DateTime(timezone=True), nullable=True)
    sla_breach_notified_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "verification_request_status IN "
            "('pending', 'confirmed_registered', "
            "'confirmed_unregistered', 'rejected', 'recalled')",
            name="ck_verification_requests_status",
        ),
        CheckConstraint(
            "priority IN ('standard', 'high', 'urgent', 'critical')",
            name="ck_verification_requests_priority",
        ),
        CheckConstraint(
            "(verification_request_status != 'rejected') OR (rejection_reason IS NOT NULL)",
            name="ck_verification_requests_rejection_reason_required",
        ),
        CheckConstraint(
            "(recalled_at IS NULL AND recalled_by IS NULL) OR "
            "(recalled_at IS NOT NULL AND recalled_by IS NOT NULL)",
            name="ck_verification_requests_recalled_pair",
        ),
        # NEW: registered requires both CPR number and remarks (response_notes)
        CheckConstraint(
            "(verification_request_status != 'confirmed_registered') OR "
            "(cpr_number IS NOT NULL AND response_notes IS NOT NULL)",
            name="ck_verification_requests_registered_fields_required",
        ),
         # NEW — unregistered requires its own reason field, not response_notes
        CheckConstraint(
            "(verification_request_status != 'confirmed_unregistered') OR "
            "(unregistered_reason IS NOT NULL)",
            name="ck_verification_requests_unregistered_reason_required",
        ),
    )