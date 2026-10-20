from sqlalchemy import (
    Column, String, Text, Date, DateTime, Integer,
    ForeignKey, CheckConstraint, text, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

""" from pgvector.sqlalchemy import Vector """

from app.database.base import Base


class RegisteredProduct(Base):
    __tablename__ = "registered_products"

    product_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    product_name = Column(Text, nullable=False)
    brand_name = Column(String(255), nullable=True)
    registration_number = Column(String(100), unique=True, nullable=False)
    product_category = Column(String(100), nullable=False)

    registration_status = Column(
        String(50), nullable=False, server_default=text("'registered'")
    )

    date_registered = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    image_path = Column(Text, nullable=True)

    # Provisional — not enforced as a real FK yet (see note above).
    # Team may remove this column entirely; revisit once decided.
    converted_from_advisory_id = Column(UUID(as_uuid=True), nullable=True)

    marketplace_detection_count = Column(Integer, nullable=False, server_default=text("0"))

    # TEMPORARY: stored as TEXT until pgvector extension is set up on the
    # server. Whoever builds the NLP/FAISS pipeline will need to migrate
    # this to Vector(768) and convert existing string data to real vectors.
    sbert_embedding = Column(Text, nullable=True)

    is_indexed = Column(Boolean, nullable=False, server_default=text("false"))

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
            "registration_status IN ('registered', 'unregistered')",
            name="ck_registered_products_status",
        ),
        CheckConstraint(
            "(deleted_at IS NULL AND deleted_by IS NULL) OR "
            "(deleted_at IS NOT NULL AND deleted_by IS NOT NULL)",
            name="ck_registered_products_soft_delete_pair",
        ),
    )