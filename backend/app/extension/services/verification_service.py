import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.extension.schemas.verification import CreateVerification
from app.models.verification_history import VerificationHistory


def create_verification(db: Session, create_verification_request: CreateVerification, consumer_id: str) -> VerificationHistory:
    verification = VerificationHistory(
        history_id=uuid.uuid4(),
        consumer_id=consumer_id,
        platform=create_verification_request.platform,
        product_title=create_verification_request.product_title,
        verification_result=create_verification_request.verification_result,
        checked_at=datetime.now(),
    )

    db.add(verification)
    db.commit()
    return verification