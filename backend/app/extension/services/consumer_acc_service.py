from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from datetime import datetime, timezone

from app.core.security import pwd_context
from app.models.consumer_accounts import ConsumerAccount
from app.extension.schemas.consumer_acc import CreateConsumerAcc, DeleteAccountRequest
from app.models import consumer_accounts

from app.extension.services import consumer_otp_service
from app.extension.services import google_auth_service

def create_user(db: Session, create_user_request: CreateConsumerAcc) -> ConsumerAccount:
    acc_exist = db.query(ConsumerAccount).filter(
        ConsumerAccount.email == create_user_request.email
    ).first()

    if acc_exist and acc_exist.is_verified:
        raise HTTPException(status_code=400, detail="Email already registered")

    if acc_exist and not acc_exist.is_verified:
        #allow change to username but check if available
        if acc_exist.username != create_user_request.username:
            taken = db.query(ConsumerAccount).filter(
                ConsumerAccount.username == create_user_request.username,
                ConsumerAccount.is_verified == True,
                ConsumerAccount.consumer_id != acc_exist.consumer_id,
            ).first()
            if taken:
                raise HTTPException(status_code=400, detail="Username already taken.")
            acc_exist.username = create_user_request.username
            db.commit()

        code = consumer_otp_service.create_otp(db, acc_exist.consumer_id, purpose="signup_verification")
        return acc_exist, code

    taken = db.query(ConsumerAccount).filter(
        ConsumerAccount.username == create_user_request.username,
        ConsumerAccount.is_verified == True,
    ).first()

    if taken:
        raise HTTPException(status_code=400, detail="Username already taken.")

    consumer_acc = ConsumerAccount(
        email = create_user_request.email,
        username = create_user_request.username,
        password_hash = pwd_context.hash(create_user_request.password),
        consumer_type = "verified account",
        auth_provider = "local",
    )
    db.add(consumer_acc)

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        error = str(e.orig)
        detail = "Username already taken" if "username" in error else "Account could not be created"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    db.refresh(consumer_acc)
    code = consumer_otp_service.create_otp(db, consumer_acc.consumer_id, purpose="signup_verification")
    return consumer_acc, code

def verify_signup_otp(db: Session, email: str, otp_code: str) -> ConsumerAccount:
    consumer = db.query(ConsumerAccount).filter(ConsumerAccount.email == email).first()

    if not consumer:
        raise HTTPException(status_code=404, detail="Account not found")

    taken = db.query(ConsumerAccount).filter(
        ConsumerAccount.username == consumer.username,
        ConsumerAccount.is_verified == True,
        ConsumerAccount.consumer_id != consumer.consumer_id,
    ).first()
    if taken:
        raise HTTPException(
            status_code=400,
            detail="Username was taken by someone else. Please choose a new username to complete verification."
        )

    consumer_otp_service.verify_otp(db, consumer.consumer_id, otp_code, purpose="signup_verification")
    consumer.is_verified = True

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException( status_code=400, detail="Account could not be verified")
    
    db.refresh(consumer)
    return consumer

def resend_signup_otp(db: Session, email: str) -> str:
    consumer = db.query(ConsumerAccount).filter(ConsumerAccount.email == email).first()

    if not consumer:
        raise HTTPException(status_code=404, detail="Account not found")
    if consumer.is_verified:
        raise HTTPException(status_code=400, detail="Account already verified")

    return consumer_otp_service.create_otp(db, consumer.consumer_id, purpose="signup_verification")

def change_pending_username(db: Session, email: str, new_username: str) -> ConsumerAccount:
    consumer = db.query (ConsumerAccount).filter(ConsumerAccount.email == email).first()

    if not consumer:
        raise HTTPException(status_code=404, detail="Account not found")

    if consumer.is_verified:
        raise HTTPException(status_code=400, detail="Account already verified")

    if consumer.username == new_username:
        return consumer

    taken = db.query(ConsumerAccount).filter(
        ConsumerAccount.username == new_username,
        ConsumerAccount.is_verified == True,
    ).first()
    if taken:
        raise HTTPException(status_code=400, detail="Username already taken.")

    consumer.username = new_username

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username already taken.")

    db.refresh(consumer)
    return consumer

def update_username(db: Session, user_id: int, updatedUsername: str):
    user = db.query(consumer_accounts.ConsumerAccount
        ).filter(consumer_accounts.ConsumerAccount.consumer_id == user_id).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    usernameExist = db.query(consumer_accounts.ConsumerAccount).filter(
        consumer_accounts.ConsumerAccount.username == updatedUsername,
        consumer_accounts.ConsumerAccount.is_verified == True,
        consumer_accounts.ConsumerAccount.consumer_id != user_id).first()

    if usernameExist:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exist.")

    user.username = updatedUsername

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exist.")
    
    db.refresh(user)
    return user

def delete_account(db: Session, user_id, payload: DeleteAccountRequest):
    consumer = db.query(ConsumerAccount).filter(
        ConsumerAccount.consumer_id == user_id
    ).first()

    if not consumer: 
        raise HTTPException(status_code=404, detail="Account not found")

    if consumer.auth_provider == "local":
        if not pwd_context.verify(payload.password, consumer.password_hash):
            raise HTTPException(status_code=403, detail="Incorrect password")

    db.delete(consumer)
    db.commit()

def login_with_google(db: Session, google_token: str) -> ConsumerAccount:
    infoID = google_auth_service.verify_google_token(google_token)
    email = infoID["email"]

    consumer = db.query(ConsumerAccount).filter(ConsumerAccount.email == email).first()

    if not consumer:
        raise HTTPException(status_code=404, detail="No account found with this email. Please sign up first.")

    if not consumer.is_verified:
        raise HTTPException(
            status_code=400,  
            detail={
                "message": "Please verify your account before logging in.", 
                "email": email},
            )

    return consumer

def request_password_reset(db: Session, email: str):
    consumer = db.query(ConsumerAccount).filter(ConsumerAccount.email == email).first()

    if not consumer:
        raise HTTPException(status_code=404, detail="Account doesn't exist.")

    if not consumer.is_verified:
        raise HTTPException(status_code=400, detail="Please verify your account before changing its password.")

    otp_code = consumer_otp_service.create_otp(db, consumer.consumer_id, purpose="password_reset")
    return consumer.email, otp_code

def reset_password(db: Session, email: str, reset_token: str, new_password: str):
    consumer = db.query(ConsumerAccount).filter(ConsumerAccount.email == email).first()

    if not consumer:
        raise HTTPException(status_code=400, detail="Invalid request")

    consumer_otp_service.verify_otp(db, consumer.consumer_id, reset_token, purpose="password_reset_token")
    consumer.password_hash = pwd_context.hash(new_password)
    db.commit()