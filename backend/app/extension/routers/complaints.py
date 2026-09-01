from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased

from app.database.sessions import get_db
from app.extension.schemas.complaints import CreateComplaint
from app.extension.services import complaints_service
from app.core.security import get_current_user, get_current_user_optional
from app.models.complaints import Complaint
from app.extension.schemas.complaints import ToPrintComplaint
from app.models.complaints_status_history import ComplaintStatusHistory

router = APIRouter()
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict | None, Depends(get_current_user)]
optional_user_dependency = Annotated[dict | None, Depends(get_current_user_optional)]

@router.post('/submitComplaint')
async def InsertComplaint(complaint: CreateComplaint, db: db_dependency, current_user: optional_user_dependency):
    try:     
        if current_user:
            consumer_id = current_user["id"]
        else:
            consumer_id = None
        
        return complaints_service.create_complaints(db, complaint, consumer_id) 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get('/ComplaintsHistory', response_model=List[ToPrintComplaint])
async def get_complaints_history(db: db_dependency, current_user: user_dependency):
    latest_complaint_changed = (
        db.query(ComplaintStatusHistory).distinct(ComplaintStatusHistory.complaint_id)
            .order_by(ComplaintStatusHistory.complaint_id, ComplaintStatusHistory.changed_at.desc())
            .subquery()
    )
    latestChanged = aliased(ComplaintStatusHistory, latest_complaint_changed)
    
    results = (
        db.query(Complaint, latestChanged)
            .outerjoin(latestChanged, latestChanged.complaint_id == Complaint.complaint_id)
            .filter(Complaint.consumer_id == current_user["id"])
            .filter(Complaint.deleted_at.is_(None))
            .filter(func.coalesce(latestChanged.new_status, Complaint.status).in_(['completed', 'dismissed']))
            .all()
    )

    return [
        ToPrintComplaint (
            history_id = status.history_id if status else None,
            complaint_id = complaint.complaint_id,
            case_reference = complaint.case_reference,
            product_title = complaint.product_title, 
            store_name = complaint.store_name,
            platform = complaint.platform,
            product_url = complaint.product_url,
            consumer_description = complaint.consumer_description,
            verification_result = complaint.verification_result,
            status = status.new_status if status else complaint.status,
            change_note = status.change_note if status else None,
            created_at = complaint.created_at,
            changed_at = status.changed_at if status else complaint.updated_at
        )
        for complaint, status in results
    ]