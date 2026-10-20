from typing import Annotated, List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased

from app.database.sessions import get_db
from app.core.security import get_current_user
from app.models.complaints_status_history import ComplaintStatusHistory
from app.models.complaints import Complaint
from app.extension.schemas.status import ToPrintStatus

router = APIRouter()
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

@router.get('/ComplaintStatus', response_model=List[ToPrintStatus])
async def get_complaints_status(db: db_dependency, current_user: user_dependency):
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
            .filter(func.coalesce(latestChanged.new_status, Complaint.status).not_in(['completed', 'dismissed']))
            .all()
    )

    return [
        ToPrintStatus (
            history_id = status.history_id if status else None,
            complaint_id = complaint.complaint_id,
            new_status = status.new_status if status else complaint.status,
            change_note = status.change_note if status else None,
            product_title = complaint.product_title, 
            changed_at = status.changed_at if status else complaint.updated_at,
            platform = complaint.platform,
            product_url = complaint.product_url,
            store_name = complaint.store_name,
            consumer_description = complaint.consumer_description,
            created_at = complaint.created_at,
        )
        for complaint, status in results
    ]