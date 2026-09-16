from sqlalchemy import (
    Column, String, Text, Date, DateTime, Integer,
    ForeignKey, CheckConstraint, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base


class UnregisteredAdvisory(Base):
    __tablename__ = "unregistered_advisories"

    advisory_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    product_name = Column(Text, nullable=False)
    advisory_details = Column(Text, nullable=True)
    advisory_date = Column(Date, nullable=True)
    source_url = Column(Text, nullable=True)
    image_path = Column(Text, nullable=True)

    # Provisional — not enforced as a real FK yet (see note above).
    # Team may remove this column entirely; revisit once decided.
    converted_from_product_id = Column(UUID(as_uuid=True), nullable=True)

    marketplace_detection_count = Column(Integer, nullable=False, server_default=text("0"))
    
    # TEMPORARY: stored as TEXT until pgvector extension is set up on the
    # server. Whoever builds the NLP/FAISS pipeline will need to migrate
    # this to Vector(768) and convert existing string data to real vectors.
    sbert_embedding = Column(Text, nullable=True)

    added_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(
            "(deleted_at IS NULL AND deleted_by IS NULL) OR "
            "(deleted_at IS NOT NULL AND deleted_by IS NOT NULL)",
            name="ck_unregistered_advisories_soft_delete_pair",
        ),
    )