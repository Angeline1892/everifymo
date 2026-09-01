from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.extension.schemas.verification import CreateVerification, ToPrintVerification
from app.core.security import get_current_user, get_current_user_optional
from app.extension.services import verification_service
from app.models.verification_history import VerificationHistory

router = APIRouter()
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict | None, Depends(get_current_user)]
optional_user_dependency = Annotated[dict | None, Depends(get_current_user_optional)]

@router.post('/submitVerification')
async def InsertVerification(verification: CreateVerification, db: db_dependency, current_user: optional_user_dependency):
    try:     
        if current_user:
            consumer_id = current_user["id"]
        else:
            consumer_id = None

        return verification_service.create_verification(db, verification, consumer_id) 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/VerificationHistory', response_model=List[ToPrintVerification])
async def get_verification_history(db: db_dependency, current_user: user_dependency):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    results = (db.query(VerificationHistory)
                .filter(VerificationHistory.consumer_id == current_user["id"])
                .order_by(VerificationHistory.checked_at.desc())
                .all()
                )

    return [
        ToPrintVerification(
            history_id=product.history_id,
            product_title=product.product_title,
            platform=product.platform,
            verification_result=product.verification_result,
            checked_at=product.checked_at
        )
        for product in results
    ]