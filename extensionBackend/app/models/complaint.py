from sqlalchemy import Column, String, Text, Date, DECIMAL, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base import Base 


class Complaint(Base):
    __tablename__ = "complaints"

    complaint_id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        server_default=func.gen_random_uuid()
    )
    
    case_reference = Column(String(20), unique=True, nullable=False)

    region_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("regions.region_id"), 
        nullable=False
    )

    source = Column(String(50), nullable=False)
    platform = Column(String(50), nullable=True)
    product_title = Column(Text, nullable=False)
    product_url = Column(Text, nullable=True)
    store_name = Column(String(255), nullable=True)
    attachment_path = Column(Text, nullable=True)
    attachment_name = Column(String(255), nullable=True)
    consumer_description = Column(Text, nullable=True)

    manufacturer = Column(String(255), nullable=True)
    product_category = Column(String(100), nullable=True)
    place_of_purchase = Column(Text, nullable=True)
    date_of_purchase = Column(Date, nullable=True)
    amount_paid = Column(DECIMAL(10, 2), nullable=True)
    nature_of_complaint = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    verification_result = Column(String(50), nullable=True)
    match_score = Column(DECIMAL(5, 4), nullable=True)

    status = Column(String(50), nullable=False, server_default="open")

    consumer_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("consumer_accounts.consumer_id"), 
        nullable=True
    )

    complainant_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("walkin_complainants.complainant_id"), 
        nullable=True
    )

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    updated_by = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.user_id"), 
        nullable=True
    )
    
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    deleted_by = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.user_id"), 
        nullable=True
    )
    
    closed_at = Column(TIMESTAMP(timezone=True), nullable=True)