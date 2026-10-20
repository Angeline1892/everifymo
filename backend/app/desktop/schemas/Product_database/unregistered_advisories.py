# backend/app/desktop/schemas/Product_database/unregistered_advisories.py
from uuid import UUID
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field

class UnregisteredAdvisoryCreate(BaseModel):
    product_name: str = Field(..., min_length=2, max_length=150)
    advisory_details: Optional[str] = Field(None, max_length=2000)
    advisory_date: Optional[date] = None
    source_url: Optional[str] = Field(None, max_length=500)

class UnregisteredAdvisoryUpdate(BaseModel):
    product_name: str = Field(..., min_length=2, max_length=150)
    advisory_details: Optional[str] = Field(None, max_length=2000)
    advisory_date: Optional[date] = None
    source_url: Optional[str] = Field(None, max_length=500)

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