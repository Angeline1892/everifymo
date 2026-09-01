from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.schemas.complaints import CreateComplaint
from app.services import complaints_service
from app.core.security import get_current_user
from app.models.complaints import Complaint
from app.schemas.complaints import ToPrintComplaint

router = APIRouter()
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

@router.post('/submitComplaint')
async def InsertComplaint(complaint: CreateComplaint, db: db_dependency, current_user: user_dependency):
    try: 
        return complaints_service.create_complaints(db, complaint, current_user["id"]) 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get('/ComplaintsHistory', response_model=List[ToPrintComplaint])
async def get_complaints(db: db_dependency, current_user: user_dependency):
    return db.query(Complaint).filter(Complaint.consumer_id == current_user["id"]).all()