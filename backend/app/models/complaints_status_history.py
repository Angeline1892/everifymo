from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class ComplaintStatusHistory(Base):
    __tablename__ = "complaint_status_history"

    history_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    complaint_id = Column(
        UUID(as_uuid=True),
        ForeignKey("complaints.complaint_id", ondelete="RESTRICT"),
        nullable=False,
    )

    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)

    changed_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
    )

    change_note = Column(Text, nullable=True)

    changed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "previous_status IS NULL OR previous_status IN "
            "('open', 'under_review', 'takedown_requested', "
            "'takedown_initiated', 'completed', 'dismissed')",
            name="ck_complaint_status_history_previous_status",
        ),
        CheckConstraint(
            "new_status IN ('open', 'under_review', 'takedown_requested', "
            "'takedown_initiated', 'completed', 'dismissed')",
            name="ck_complaint_status_history_new_status",
        ),
    )