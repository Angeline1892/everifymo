# backend/app/desktop/services/Product_database/unregistered_advisory_service.py
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func
from fastapi import HTTPException, status

from fastapi import Request
from app.core.audit import write_audit_log, get_user_region_code
from app.core.constants import AuditAction

from app.models.unregistered_advisories import UnregisteredAdvisory
from app.models.registered_products import RegisteredProduct
from app.models.users import User
from app.core.user_display import format_officer_display_name
from app.desktop.schemas.Product_database.unregistered_advisories import (
    UnregisteredAdvisoryCreate,
    UnregisteredAdvisoryUpdate
)
from app.desktop.services.Product_database.csv_sync import sync_registered_products_to_csv, sync_unregistered_advisories_to_csv


def format_advisory_response(advisory: UnregisteredAdvisory, db: Session):
    added_by_user = None
    if advisory.added_by:
        added_by_user = db.query(User).filter(User.user_id == advisory.added_by).first()

    updated_by_user = None
    if advisory.updated_by:
        updated_by_user = db.query(User).filter(User.user_id == advisory.updated_by).first()

    return {
        "advisory_id": advisory.advisory_id,
        "product_name": advisory.product_name,
        "advisory_details": advisory.advisory_details,
        "advisory_date": advisory.advisory_date,
        "source_url": advisory.source_url,
        "marketplace_detection_count": advisory.marketplace_detection_count,
        "added_by": format_officer_display_name(added_by_user) if added_by_user else None,
        "updated_by": format_officer_display_name(updated_by_user) if updated_by_user else None,
        "converted_from_product_id": advisory.converted_from_product_id,
        "created_at": advisory.created_at,
        "updated_at": advisory.updated_at,
    }


def get_all_unregistered_advisories(db: Session, current_user: User):
    AddedUser = aliased(User)
    UpdatedUser = aliased(User)

    query = db.query(
        UnregisteredAdvisory,
        AddedUser,
        UpdatedUser
    ).outerjoin(
        AddedUser, UnregisteredAdvisory.added_by == AddedUser.user_id
    ).outerjoin(
        UpdatedUser, UnregisteredAdvisory.updated_by == UpdatedUser.user_id
    ).filter(
        UnregisteredAdvisory.deleted_at.is_(None)
    )

    if current_user.role != "superadmin" and current_user.region_id:
        query = query.filter(
            (AddedUser.region_id == current_user.region_id) | (UnregisteredAdvisory.added_by.is_(None))
        )

    results = query.order_by(
        UnregisteredAdvisory.created_at.desc()
    ).all()

    formatted = []
    for advisory, added_user, updated_user in results:
        formatted.append({
            "advisory_id": advisory.advisory_id,
            "product_name": advisory.product_name,
            "advisory_details": advisory.advisory_details,
            "advisory_date": advisory.advisory_date,
            "source_url": advisory.source_url,
            "marketplace_detection_count": advisory.marketplace_detection_count,
            "added_by": format_officer_display_name(added_user) if added_user else None,
            "updated_by": format_officer_display_name(updated_user) if updated_user else None,
            "converted_from_product_id": advisory.converted_from_product_id,
            "created_at": advisory.created_at,
            "updated_at": advisory.updated_at,
        })
    return formatted


def create_unregistered_advisory(db: Session, data: UnregisteredAdvisoryCreate, current_user, request: Request = None):
    # Check duplicate product name
    existing_name = db.query(UnregisteredAdvisory).filter(
        func.lower(UnregisteredAdvisory.product_name) == func.lower(data.product_name),
        UnregisteredAdvisory.deleted_at.is_(None)
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

    region_code = get_user_region_code(db, current_user)
    current_user_id = current_user.user_id
    current_user_role = current_user.role

    new_advisory = UnregisteredAdvisory(
        product_name=data.product_name,
        advisory_details=data.advisory_details,
        advisory_date=data.advisory_date,
        source_url=data.source_url,
        added_by=current_user_id,
        updated_by=current_user_id,
    )

    db.add(new_advisory)
    db.commit()
    db.refresh(new_advisory)
    sync_unregistered_advisories_to_csv(db)

    write_audit_log(
        db,
        user=None,
        user_id_override=current_user_id,
        user_role_override=current_user_role,
        action=AuditAction.CREATE_UNREGISTERED_ADVISORY,
        target_table="unregistered_advisories",
        target_id=new_advisory.advisory_id,
        target_reference=new_advisory.product_name,
        new_value={
            "product_name": new_advisory.product_name,
            "advisory_details": new_advisory.advisory_details,
            "source_url": new_advisory.source_url,
        },
        request=request,
        region_code=region_code,
    )

    return format_advisory_response(new_advisory, db)


def update_unregistered_advisory(db: Session, advisory_id, data: UnregisteredAdvisoryUpdate, current_user, request: Request = None):
    advisory = db.query(UnregisteredAdvisory).filter(
        UnregisteredAdvisory.advisory_id == advisory_id,
        UnregisteredAdvisory.deleted_at.is_(None)
    ).first()

    if not advisory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unregistered advisory not found."
        )

    # Check duplicate product name excluding current advisory
    existing_name = db.query(UnregisteredAdvisory).filter(
        func.lower(UnregisteredAdvisory.product_name) == func.lower(data.product_name),
        UnregisteredAdvisory.advisory_id != advisory_id,
        UnregisteredAdvisory.deleted_at.is_(None)
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

    old_value = {
        "product_name": advisory.product_name,
        "advisory_details": advisory.advisory_details,
        "source_url": advisory.source_url,
    }
    region_code = get_user_region_code(db, current_user)
    current_user_id = current_user.user_id
    current_user_role = current_user.role

    advisory.product_name = data.product_name
    advisory.advisory_details = data.advisory_details
    advisory.advisory_date = data.advisory_date
    advisory.source_url = data.source_url
    advisory.updated_by = current_user_id

    db.commit()
    db.refresh(advisory)
    sync_unregistered_advisories_to_csv(db)

    write_audit_log(
        db,
        user=None,
        user_id_override=current_user_id,
        user_role_override=current_user_role,
        action=AuditAction.UPDATE_UNREGISTERED_ADVISORY,
        target_table="unregistered_advisories",
        target_id=advisory.advisory_id,
        target_reference=advisory.product_name,
        old_value=old_value,
        new_value={
            "product_name": advisory.product_name,
            "advisory_details": advisory.advisory_details,
            "source_url": advisory.source_url,
        },
        request=request,
        region_code=region_code,
    )

    return format_advisory_response(advisory, db)


def convert_product_to_advisory(db: Session, product_id, data: UnregisteredAdvisoryCreate, current_user, request: Request = None):
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
    source_product_name = product.product_name

    # Soft delete the product
    product.deleted_at = func.now()
    product.deleted_by = current_user_id

    # Create new unregistered advisory
    new_advisory = UnregisteredAdvisory(
        product_name=data.product_name,
        advisory_details=data.advisory_details,
        advisory_date=data.advisory_date,
        source_url=data.source_url,
        converted_from_product_id=product_id,
        added_by=current_user_id,
        updated_by=current_user_id,
    )

    db.add(new_advisory)
    db.commit()
    db.refresh(new_advisory)
    sync_registered_products_to_csv(db)
    sync_unregistered_advisories_to_csv(db)

    write_audit_log(
        db,
        user=None,
        user_id_override=current_user_id,
        user_role_override=current_user_role,
        action=AuditAction.CONVERT_TO_UNREGISTERED_ADVISORY,
        target_table="unregistered_advisories",
        target_id=new_advisory.advisory_id,
        target_reference=new_advisory.product_name,
        old_value={"source_product_id": str(product_id), "source_product_name": source_product_name},
        new_value={
            "product_name": new_advisory.product_name,
            "advisory_details": new_advisory.advisory_details,
            "source_url": new_advisory.source_url,
        },
        request=request,
        region_code=region_code,
    )

    return format_advisory_response(new_advisory, db)


def delete_unregistered_advisory(db: Session, advisory_id, current_user, request: Request = None):
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
    old_value = {
        "product_name": advisory.product_name,
        "advisory_details": advisory.advisory_details,
    }

    advisory.deleted_at = func.now()
    advisory.deleted_by = current_user_id

    db.commit()
    sync_unregistered_advisories_to_csv(db)

    write_audit_log(
        db,
        user=None,
        user_id_override=current_user_id,
        user_role_override=current_user_role,
        action=AuditAction.DELETE_UNREGISTERED_ADVISORY,
        target_table="unregistered_advisories",
        target_id=advisory.advisory_id,
        target_reference=old_value["product_name"],
        old_value=old_value,
        request=request,
        region_code=region_code,
    )

    return {"message": "Advisory deleted successfully."}