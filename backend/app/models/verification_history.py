from sqlalchemy import Column, String, ForeignKey, Text, DateTime, Integer, Boolean, text, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func


from app.database.base import Base


class VerificationHistory(Base):
    __tablename__ = "verification_history"


    history_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )


    consumer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("consumer_account_table.consumer_id", ondelete="SET NULL"),
        nullable=True,
    )
   
    platform = Column(String(100), nullable=False)
    product_title = Column(Text, nullable=False)
    verification_result = Column(String(50), nullable=False)
    confidence_score = Column(Numeric(precision=5, scale=2), nullable=True)


    checked_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())