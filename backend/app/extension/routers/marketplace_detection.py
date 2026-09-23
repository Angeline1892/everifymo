from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.desktop.services.Product_database.registered_product_service import (
    increment_marketplace_detection_count as increment_registered_detection,
)
from app.desktop.services.Product_database.unregistered_advisory_service import (
    increment_marketplace_detection_count as increment_unregistered_detection,
)
from app.models.registered_products import RegisteredProduct
from app.models.unregistered_advisories import UnregisteredAdvisory


class DisplayedDetection(BaseModel):
    record_type: Literal["registered", "unregistered"]
    displayed_title: str


router = APIRouter()


@router.post("/marketplace-detections")
def increment_displayed_detection(
    detection: DisplayedDetection,
    db: Session = Depends(get_db),
):
    db.execute(text("SET app.bypass_rls = 'true'"))
    title = detection.displayed_title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="displayed_title is required")

    if detection.record_type == "registered":
        normalized_title = func.lower(RegisteredProduct.product_name)
        record = db.query(RegisteredProduct).filter(
            normalized_title == title.lower(),
            RegisteredProduct.deleted_at.is_(None),
        ).first()
        if record is None:
            records = db.query(RegisteredProduct).filter(
                RegisteredProduct.deleted_at.is_(None),
            ).all()
            matches = [
                item for item in records
                if item.product_name and item.product_name.strip().lower() in title.lower()
            ]
            record = max(matches, key=lambda item: len(item.product_name), default=None)
        if record is None:
            raise HTTPException(status_code=404, detail="Displayed registered record not found")
        incremented = increment_registered_detection(db, record.product_id)
    else:
        record = db.query(UnregisteredAdvisory).filter(
            func.lower(UnregisteredAdvisory.product_name) == title.lower(),
            UnregisteredAdvisory.deleted_at.is_(None),
        ).first()
        if record is None:
            raise HTTPException(status_code=404, detail="Displayed unregistered record not found")
        incremented = increment_unregistered_detection(db, record.advisory_id)

    if not incremented:
        raise HTTPException(status_code=404, detail="Displayed record not found")
    return {"success": True}
