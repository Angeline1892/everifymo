# backend/app/desktop/schemas/Product_database/registered_products.py
from uuid import UUID
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field

class RegisteredProductCreate(BaseModel):
    product_name: str = Field(..., min_length=2, max_length=150)
    brand_name: Optional[str] = Field(None, max_length=150)
    registration_number: str = Field(..., min_length=1, max_length=100)
    product_category: Optional[str] = "Cosmetics"
    date_registered: Optional[date] = None
    expiry_date: Optional[date] = None

class RegisteredProductUpdate(BaseModel):
    product_name: str = Field(..., min_length=2, max_length=150)
    brand_name: Optional[str] = Field(None, max_length=150)
    registration_number: str = Field(..., min_length=1, max_length=100)
    product_category: Optional[str] = "Cosmetics"
    date_registered: Optional[date] = None
    expiry_date: Optional[date] = None

class RegisteredProductResponse(BaseModel):
    product_id: UUID
    product_name: str
    brand_name: Optional[str]
    registration_number: str
    product_category: str
    registration_status: str
    date_registered: Optional[date]
    expiry_date: Optional[date]
    marketplace_detection_count: int
    added_by: Optional[str]
    updated_by: Optional[str]
    converted_from_advisory_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True