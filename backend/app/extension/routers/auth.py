from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.core.security import authenticate_consumer, create_consumer_access_token
from app.extension.schemas.auth import Token

from app.extension.services.consumer_acc_service import login_with_google
from app.extension.schemas.consumer_acc import GoogleLoginRequest

from app.core.extension_limiter import limiter

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

db_dependency = Annotated[Session, Depends(get_db)]

@router .post("/token", response_model=Token)
@limiter.limit("5/minute")
async def login_for_access_token(
        request: Request,
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
        db: db_dependency,
    ):

    consumer = authenticate_consumer(form_data.username, form_data.password, db)

    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate user",
        )

    if not consumer.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in",
        )
    
    token = create_consumer_access_token(consumer.username, consumer.consumer_id, timedelta(minutes=20))

    return {
        "access_token": token,
        "token_type": "bearer",
        "username": consumer.username
    }

@router .post("/google")
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    consumer = login_with_google(db, payload.token)
    access_token = create_consumer_access_token(consumer.username, consumer.consumer_id, timedelta(minutes=20))

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": consumer.username,
        "email": consumer.email
    }