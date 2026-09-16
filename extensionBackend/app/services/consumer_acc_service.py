from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.core.security import bcrypt_context
from app.models.consumer_accounts import ConsumerAccount
from app.schemas.consumer_acc import CreateConsumerAcc

def create_user(db: Session, create_user_request: CreateConsumerAcc) -> ConsumerAccount:
    consumer_acc = ConsumerAccount(
        email = create_user_request.email,
        username = create_user_request.username,
        password_hash = bcrypt_context.hash(create_user_request.password),
    )
    db.add(consumer_acc)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )
    db.refresh(consumer_acc)
    return consumer_acc