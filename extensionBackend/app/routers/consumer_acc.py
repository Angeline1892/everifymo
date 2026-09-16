from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.schemas.consumer_acc import CreateConsumerAcc
from app.services import consumer_acc_service

router = APIRouter(
    prefix="/accounts",
    tags=["Consumer Accounts"]
)

db_dependency = Annotated[Session, Depends(get_db)]

@router .post("/", status_code=status.HTTP_201_CREATED)
async def create_user(db: db_dependency, create_user_request: CreateConsumerAcc):
    consumer_acc_service.create_user(db, create_user_request)
    return {"detail": "Account created successfully"}