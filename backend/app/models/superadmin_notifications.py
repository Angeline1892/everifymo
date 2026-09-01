from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Index,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class SuperadminNotification(Base):
    __tablename__ = "superadmin_notifications"

    notification_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    recipient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    event_type = Column(String(50), nullable=False)

    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    related_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )

    is_read = Column(Boolean, nullable=False, server_default=text("false"))
    read_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        # is_read/read_at must stay in sync - enforced at the DB level so no
        # code path can desync them.
        CheckConstraint(
            "(is_read = false AND read_at IS NULL) OR (is_read = true AND read_at IS NOT NULL)",
            name="ck_superadmin_notifications_read_pair",
        ),
        # Matches the main query pattern: unread notifications for a given
        # superadmin, newest first (badge count + dropdown list).
        Index(
            "ix_superadmin_notifications_recipient_unread",
            "recipient_id",
            "is_read",
            "created_at",
        ),
        # NOTE: event_type is intentionally NOT constrained at the DB level.
        # Enforce the allowed set in Python (e.g. an Enum in
        # notification_service.py) instead - the list is still actively
        # growing and a DB CHECK here would mean a migration for every new
        # event type.
    )