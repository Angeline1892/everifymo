from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.core.security import authenticate_consumer, create_access_token
from app.schemas.auth import Token

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

db_dependency = Annotated[Session, Depends(get_db)]

@router .post("/token", response_model=Token)
async def login_for_access_token(
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
        db: db_dependency,
    ):

    consumer = authenticate_consumer(form_data.username, form_data.password, db)

    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate user",
        )
    
    token = create_access_token(consumer.username, consumer.consumer_id, timedelta(minutes=20))

    return {
        "access_token": token,
        "token_type": "bearer"
    }