# backend/app/desktop/schemas/Product_database/unregistered_advisories.py
from uuid import UUID
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

class UnregisteredAdvisoryCreate(BaseModel):
    product_name: str
    advisory_details: Optional[str] = None
    advisory_date: Optional[date] = None
    source_url: Optional[str] = None

class UnregisteredAdvisoryUpdate(BaseModel):
    product_name: str
    advisory_details: Optional[str] = None
    advisory_date: Optional[date] = None
    source_url: Optional[str] = None

class UnregisteredAdvisoryResponse(BaseModel):
    advisory_id: UUID
    product_name: str
    advisory_details: Optional[str]
    advisory_date: Optional[date]
    source_url: Optional[str]
    marketplace_detection_count: int
    added_by: Optional[str]
    updated_by: Optional[str]
    converted_from_product_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True