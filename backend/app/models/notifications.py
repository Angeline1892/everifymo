from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    recipient_type = Column(String(50), nullable=False)

  
    consumer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("consumer_account_table.consumer_id", ondelete="SET NULL"),
        nullable=True,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=True,
    )
    complaint_id = Column(
        UUID(as_uuid=True),
        ForeignKey("complaints.complaint_id", ondelete="SET NULL"),
        nullable=True,
    )

    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    is_read = Column(Boolean, nullable=False, server_default=text("false"))
    read_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "recipient_type IN ('consumer', 'personnel')",
            name="ck_notifications_recipient_type",
        ),
        CheckConstraint(
            "(recipient_type = 'consumer' AND consumer_id IS NOT NULL AND user_id IS NULL) OR "
            "(recipient_type = 'personnel' AND user_id IS NOT NULL AND consumer_id IS NULL)",
            name="ck_notifications_exactly_one_recipient",
        ),
        CheckConstraint(
            "(is_read = false AND read_at IS NULL) OR (is_read = true AND read_at IS NOT NULL)",
            name="ck_notifications_read_pair",
        ),
    )