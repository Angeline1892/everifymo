# backend/app/desktop/services/Product_database/registered_product_service.py
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func
from fastapi import HTTPException, status

from fastapi import Request
from app.core.audit import write_audit_log, get_user_region_code
from app.core.constants import AuditAction

from app.models.registered_products import RegisteredProduct
from app.models.unregistered_advisories import UnregisteredAdvisory
from app.models.users import User
from app.core.user_display import format_officer_display_name
from app.desktop.schemas.Product_database.registered_products import (
    RegisteredProductCreate,
    RegisteredProductUpdate
)
from app.desktop.services.Product_database.csv_sync import sync_registered_products_to_csv, sync_unregistered_advisories_to_csv


def format_product_response(product: RegisteredProduct, db: Session):
    added_by_user = None
    if product.added_by:
        added_by_user = db.query(User).filter(User.user_id == product.added_by).first()

    updated_by_user = None
    if product.updated_by:
        updated_by_user = db.query(User).filter(User.user_id == product.updated_by).first()

    return {
        "product_id": product.product_id,
        "product_name": product.product_name,
        "brand_name": product.brand_name,
        "registration_number": product.registration_number,
        "product_category": product.product_category,
        "registration_status": product.registration_status,
        "date_registered": product.date_registered,
        "expiry_date": product.expiry_date,
        "marketplace_detection_count": product.marketplace_detection_count,
        "added_by": format_officer_display_name(added_by_user) if added_by_user else None,
        "updated_by": format_officer_display_name(updated_by_user) if updated_by_user else None,
        "converted_from_advisory_id": product.converted_from_advisory_id,
        "created_at": product.created_at,
        "updated_at": product.updated_at,
    }


def get_all_registered_products(db: Session, current_user: User):
    AddedUser = aliased(User)
    UpdatedUser = aliased(User)

    query = db.query(
        RegisteredProduct,
        AddedUser,
        UpdatedUser
    ).outerjoin(
        AddedUser, RegisteredProduct.added_by == AddedUser.user_id
    ).outerjoin(
        UpdatedUser, RegisteredProduct.updated_by == UpdatedUser.user_id
    ).filter(
        RegisteredProduct.deleted_at.is_(None)
    )

    if current_user.role != "superadmin" and current_user.region_id:
        query = query.filter(
            (AddedUser.region_id == current_user.region_id) | (RegisteredProduct.added_by.is_(None))
        )

    results = query.order_by(
        RegisteredProduct.created_at.desc()
    ).all()

    formatted = []
    for product, added_user, updated_user in results:
        formatted.append({
            "product_id": product.product_id,
            "product_name": product.product_name,
            "brand_name": product.brand_name,
            "registration_number": product.registration_number,
            "product_category": product.product_category,
            "registration_status": product.registration_status,
            "date_registered": product.date_registered,
            "expiry_date": product.expiry_date,
            "marketplace_detection_count": product.marketplace_detection_count,
            "added_by": format_officer_display_name(added_user) if added_user else None,
            "updated_by": format_officer_display_name(updated_user) if updated_user else None,
            "converted_from_advisory_id": product.converted_from_advisory_id,
            "created_at": product.created_at,
            "updated_at": product.updated_at,
        })
    return formatted


def create_registered_product(db: Session, data: RegisteredProductCreate, current_user, request: Request = None):
    # Check duplicate product name
    existing_name = db.query(RegisteredProduct).filter(
        func.lower(RegisteredProduct.product_name) == func.lower(data.product_name),
        RegisteredProduct.deleted_at.is_(None)
    ).first()

    if existing_name:
        region_name = None
        if existing_name.added_by:
            creator = db.query(User).filter(User.user_id == existing_name.added_by).first()
            if creator and creator.region_id:
                from app.models.regions import Region
                region = db.query(Region).filter(Region.region_id == creator.region_id).first()
                if region:
                    region_name = region.region_name

        if region_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate product name detected. This product already exists in the database (Region: {region_name})."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate product name detected. This product already exists in the database."
            )

    existing = db.query(RegisteredProduct).filter(
        RegisteredProduct.registration_number == data.registration_number,
        RegisteredProduct.deleted_at.is_(None)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration Number must be unique. This number already exists."
        )

    region_code = get_user_region_code(db, current_user)
    current_user_id = current_user.user_id
    current_user_role = current_user.role

    new_product = RegisteredProduct(
        product_name=data.product_name,
        brand_name=data.brand_name,
        registration_number=data.registration_number,
        product_category=data.product_category,
        date_registered=data.date_registered,
        expiry_date=data.expiry_date,
        added_by=current_user_id,
        updated_by=current_user_id,
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    sync_registered_products_to_csv(db)

    write_audit_log(
        db,
        user=None,
        user_id_override=current_user_id,
        user_role_override=current_user_role,
        action=AuditAction.CREATE_REGISTERED_PRODUCT,
        target_table="registered_products",
        target_id=new_product.product_id,
        target_reference=new_product.product_name,
        new_value={
            "product_name": new_product.product_name,
            "registration_number": new_product.registration_number,
            "product_category": new_product.product_category,
        },
        request=request,
        region_code=region_code,
    )

    return format_product_response(new_product, db)


def update_registered_product(db: Session, product_id, data: RegisteredProductUpdate, current_user, request: Request = None):
    product = db.query(RegisteredProduct).filter(
        RegisteredProduct.product_id == product_id,
        RegisteredProduct.deleted_at.is_(None)
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registered product not found."
        )

    # Check duplicate product name excluding current product
    existing_name = db.query(RegisteredProduct).filter(
        func.lower(RegisteredProduct.product_name) == func.lower(data.product_name),
        RegisteredProduct.product_id != product_id,
        RegisteredProduct.deleted_at.is_(None)
    ).first()

    if existing_name:
        region_name = None
        if existing_name.added_by:
            creator = db.query(User).filter(User.user_id == existing_name.added_by).first()
            if creator and creator.region_id:
                from app.models.regions import Region
                region = db.query(Region).filter(Region.region_id == creator.region_id).first()
                if region:
                    region_name = region.region_name

        if region_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate product name detected. This product already exists in the database (Region: {region_name})."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate product name detected. This product already exists in the database."
            )

    # Check unique constraint excluding current product
    existing = db.query(RegisteredProduct).filter(
        RegisteredProduct.registration_number == data.registration_number,
        RegisteredProduct.product_id != product_id,
        RegisteredProduct.deleted_at.is_(None)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration Number must be unique. This number already exists."
        )

    old_value = {
        "product_name": product.product_name,
        "brand_name": product.brand_name,
        "registration_number": product.registration_number,
        "product_category": product.product_category,
    }
    region_code = get_user_region_code(db, current_user)
    current_user_id = current_user.user_id
    current_user_role = current_user.role

    product.product_name = data.product_name
    product.brand_name = data.brand_name
    product.registration_number = data.registration_number
    product.product_category = data.product_category
    product.date_registered = data.date_registered
    product.expiry_date = data.expiry_date
    product.updated_by = current_user_id

    db.commit()
    db.refresh(product)
    sync_registered_products_to_csv(db)

    write_audit_log(
        db,
        user=None,
        user_id_override=current_user_id,
        user_role_override=current_user_role,
        action=AuditAction.UPDATE_REGISTERED_PRODUCT,
        target_table="registered_products",
        target_id=product.product_id,
        target_reference=product.product_name,
        old_value=old_value,
        new_value={
            "product_name": product.product_name,
            "brand_name": product.brand_name,
            "registration_number": product.registration_number,
            "product_category": product.product_category,
        },
        request=request,
        region_code=region_code,
    )

    return format_product_response(product, db)


def convert_advisory_to_product(db: Session, advisory_id, data: RegisteredProductCreate, current_user, request: Request = None):
    advisory = db.query(UnregisteredAdvisory).filter(
        UnregisteredAdvisory.advisory_id == advisory_id,
        UnregisteredAdvisory.deleted_at.is_(None)
    ).first()

    if not advisory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unregistered advisory not found."
        )

    region_code = get_user_region_code(db, current_user)
    current_user_id = current_user.user_id
    current_user_role = current_user.role
    source_advisory_name = advisory.product_name

    # Soft delete the advisory
    advisory.deleted_at = func.now()
    advisory.deleted_by = current_user_id

    # Create new registered product
    new_product = RegisteredProduct(
        product_name=data.product_name,
        brand_name=data.brand_name,
        registration_number=data.registration_number,
        product_category=data.product_category,
        date_registered=data.date_registered,
        expiry_date=data.expiry_date,
        converted_from_advisory_id=advisory_id,
        added_by=current_user_id,
        updated_by=current_user_id,
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    sync_registered_products_to_csv(db)
    sync_unregistered_advisories_to_csv(db)

    write_audit_log(
        db,
        user=None,
        user_id_override=current_user_id,
        user_role_override=current_user_role,
        action=AuditAction.CONVERT_TO_REGISTERED_PRODUCT,
        target_table="registered_products",
        target_id=new_product.product_id,
        target_reference=new_product.product_name,
        old_value={"source_advisory_id": str(advisory_id), "source_advisory_name": source_advisory_name},
        new_value={
            "product_name": new_product.product_name,
            "registration_number": new_product.registration_number,
            "product_category": new_product.product_category,
        },
        request=request,
        region_code=region_code,
    )

    return format_product_response(new_product, db)


def delete_registered_product(db: Session, product_id, current_user, request: Request = None):
    product = db.query(RegisteredProduct).filter(
        RegisteredProduct.product_id == product_id,
        RegisteredProduct.deleted_at.is_(None)
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registered product not found."
        )

    region_code = get_user_region_code(db, current_user)
    current_user_id = current_user.user_id
    current_user_role = current_user.role
    old_value = {
        "product_name": product.product_name,
        "registration_number": product.registration_number,
    }

    product.deleted_at = func.now()
    product.deleted_by = current_user_id

    db.commit()
    sync_registered_products_to_csv(db)

    write_audit_log(
        db,
        user=None,
        user_id_override=current_user_id,
        user_role_override=current_user_role,
        action=AuditAction.DELETE_REGISTERED_PRODUCT,
        target_table="registered_products",
        target_id=product.product_id,
        target_reference=old_value["product_name"],
        old_value=old_value,
        request=request,
        region_code=region_code,
    )

    return {"message": "Product deleted successfully."}