# backend/app/desktop/routers/Product_database/registered_product.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from uuid import UUID

from fastapi import Request

from app.database.sessions import get_db
from app.models.users import User
from app.desktop.schemas.Product_database.registered_products import (
    RegisteredProductCreate,
    RegisteredProductUpdate,
    RegisteredProductResponse,
)
from app.desktop.services.Product_database.registered_product_service import (
    create_registered_product,
    get_all_registered_products,
    update_registered_product,
    convert_advisory_to_product,
    delete_registered_product,
)

# Fetch the logged-in user profile from the authentication token
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/registered-products", tags=["Registered Products"])


@router.get("/", response_model=List[RegisteredProductResponse])
def list_registered_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    return get_all_registered_products(db, current_user)


@router.post("/", response_model=RegisteredProductResponse)
def add_registered_product(
    payload: RegisteredProductCreate,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user), # Retrieve actual authenticated user
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    # Pass current_user.user_id to record who added the product
    return create_registered_product(db, payload, current_user, http_request)


@router.put("/{product_id}", response_model=RegisteredProductResponse)
def edit_registered_product(
    product_id: UUID,
    payload: RegisteredProductUpdate,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    return update_registered_product(db, product_id, payload, current_user, http_request)

@router.post("/convert-from-advisory/{advisory_id}", response_model=RegisteredProductResponse)
def convert_from_advisory(
    advisory_id: UUID,
    payload: RegisteredProductCreate,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    return convert_advisory_to_product(db, advisory_id, payload, current_user, http_request)

@router.delete("/{product_id}")
def delete_registered_product_endpoint(
    product_id: UUID,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    return delete_registered_product(db, product_id, current_user, http_request)