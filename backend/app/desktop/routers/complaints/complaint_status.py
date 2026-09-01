import logging
from typing import Annotated, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.sessions import get_db  
from app.models.complaints import Complaint
from app.models.complaints_status_history import ComplaintStatusHistory
from app.models.consumer_accounts import ConsumerAccount
from app.models.walkin_complainants import WalkinComplainant
from app.desktop.services.status.send_email import send_status_update_email
from app.core.dependencies import get_current_user
from app.models.regions import Region
from app.models.users import User

logger = logging.getLogger(__name__)

router = APIRouter()
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[User, Depends(get_current_user)]

STATUS_LABELS = {
    "open": "Open",
    "under_review": "Under Review",
    "takedown_requested": "Takedown Requested",
    "takedown_initiated": "Takedown Initiated",
    "completed": "Completed",
    "dismissed": "Dismissed",
}


class StatusUpdateRequest(BaseModel):
    status: str
    change_note: str | None = None


@router.patch("/complaints/{complaint_id}/status")
async def update_complaint_status(
    complaint_id: UUID,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user), 
):
    query = db.query(Complaint).filter(Complaint.complaint_id == complaint_id)
    if current_user.role != "superadmin" and current_user.region_id:
        query = query.filter(Complaint.region_id == current_user.region_id)
    complaint = query.first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    previous_status = complaint.status
    complaint.status = payload.status
    complaint.updated_by = current_user.user_id

    if complaint.source == "extension":
        db.add(ComplaintStatusHistory(
            complaint_id=complaint.complaint_id,
            previous_status=previous_status,
            new_status=payload.status,
            changed_by=current_user.user_id, 
            change_note=payload.change_note,
        ))

    db.commit()
    db.refresh(complaint)

    recipient_email = None
    if complaint.consumer_id:
        consumer = db.query(ConsumerAccount).filter(ConsumerAccount.consumer_id == complaint.consumer_id).first()
        recipient_email = consumer.email if consumer else None

    if recipient_email:
        try:
            await send_status_update_email(
                to_email=recipient_email,
                product_title=complaint.product_title,
                case_reference=complaint.case_reference,
                new_status_label=STATUS_LABELS.get(complaint.status, complaint.status),
                change_note=payload.change_note,
            )
        except Exception as e:
            logger.error(f"Failed to send status update email for {complaint.complaint_id}: {e}")

    return complaint


@router.get("/complaints-status-update")
def list_complaints(db: Session = Depends(get_db), current_user = Depends(get_current_user),):
    query = db.query(Complaint).filter(Complaint.deleted_at.is_(None))
    if current_user.role != "superadmin" and current_user.region_id:
        query = query.filter(Complaint.region_id == current_user.region_id)
    complaints = query.order_by(Complaint.created_at.desc()).all()

    result = []
    for c in complaints:
        region = db.query(Region).filter(Region.region_id == c.region_id).first()

        reporter_username = None
        reporter_email = None
        if c.source == "extension" and c.consumer_id:
            consumer = db.query(ConsumerAccount).filter(ConsumerAccount.consumer_id == c.consumer_id).first()
            if consumer:
                reporter_email = consumer.email
                reporter_username = consumer.email.split("@")[0]
        elif c.source == "walk_in" and c.complainant_id:
            complainant = db.query(WalkinComplainant).filter(WalkinComplainant.complainant_id == c.complainant_id).first()
            if complainant:
                reporter_email = complainant.email
                reporter_username = complainant.full_name

        result.append({
            "complaintId": str(c.complaint_id),
            "caseReference": c.case_reference,
            "productTitle": c.product_title,
            "manufacturer": c.manufacturer,
            "region": region.region_name if region else None,
            "status": c.status,
            "reporterUsername": reporter_username,
            "reporterEmail": reporter_email,
        })

    return result