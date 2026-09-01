import uuid
from sqlalchemy.orm import Session

from app.models.complaints import Complaint
from app.schemas.complaints import CreateComplaint

def create_complaints(db: Session, create_consumer_request: CreateComplaint, consumer_id: str) -> Complaint:
    complaint = Complaint(
        case_reference=f"CMP-{uuid.uuid4().hex[:8].upper()}",
        source="extension",
        product_title = create_consumer_request.product_title,
        seller_name = create_consumer_request.seller_name,
        product_url = str(create_consumer_request.product_url),
        verification_result="not_verified_yet",
        consumer_id=consumer_id,
    ) 
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint

