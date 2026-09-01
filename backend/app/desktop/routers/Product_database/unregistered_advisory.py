# backend/app/desktop/routers/Product_database/unregistered_advisory.py 
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from uuid import UUID

from fastapi import Request

from app.database.sessions import get_db
from app.models.users import User
from app.desktop.schemas.Product_database.unregistered_advisories import (
    UnregisteredAdvisoryCreate,
    UnregisteredAdvisoryUpdate,
    UnregisteredAdvisoryResponse,
)
from app.desktop.services.Product_database.unregistered_advisory_service import (
    create_unregistered_advisory,
    get_all_unregistered_advisories,
    update_unregistered_advisory,
    convert_product_to_advisory,
    delete_unregistered_advisory,
)

# Fetch the logged-in user profile from the authentication token
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/unregistered-advisories", tags=["Unregistered Advisories"])


@router.get("/", response_model=List[UnregisteredAdvisoryResponse])
def list_unregistered_advisories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    return get_all_unregistered_advisories(db, current_user)


@router.post("/", response_model=UnregisteredAdvisoryResponse)
def add_unregistered_advisory(
    payload: UnregisteredAdvisoryCreate,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user), # Retrieve actual authenticated user
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    # Pass current_user.user_id to record who added the product
    return create_unregistered_advisory(db, payload, current_user, http_request)


@router.put("/{advisory_id}", response_model=UnregisteredAdvisoryResponse)
def edit_unregistered_advisory(
    advisory_id: UUID,
    payload: UnregisteredAdvisoryUpdate,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    return update_unregistered_advisory(db, advisory_id, payload, current_user, http_request)


@router.post("/convert-from-product/{product_id}", response_model=UnregisteredAdvisoryResponse)
def convert_from_product(
    product_id: UUID,
    payload: UnregisteredAdvisoryCreate,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    return convert_product_to_advisory(db, product_id, payload, current_user, http_request)


@router.delete("/{advisory_id}")
def delete_unregistered_advisory_endpoint(
    advisory_id: UUID,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    return delete_unregistered_advisory(db, advisory_id, current_user, http_request)
