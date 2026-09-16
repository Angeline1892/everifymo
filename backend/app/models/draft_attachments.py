from sqlalchemy import Column, String, Text, BigInteger, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class DraftAttachment(Base):
    __tablename__ = "draft_attachments"

    attachment_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    walkin_draft_id = Column(
        UUID(as_uuid=True),
        ForeignKey("walkin_intake_drafts.draft_id", ondelete="CASCADE"),
        nullable=False,
    )

    # File information
    file_name = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)

    uploaded_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())