from pydantic import BaseModel, ConfigDict, HttpUrl
from datetime import datetime
from uuid import UUID
from typing import Optional

class CreateComplaint(BaseModel):
    product_title: str
    seller_name: str
    product_url: HttpUrl
    verification_result: str = "pending...(nlp not attached yet)"

class ToPrintComplaint(BaseModel):
    model_config = ConfigDict(from_attribute=True)

    complaint_id: UUID
    case_reference: str
    product_title:  str
    product_url: Optional[str] = None
    seller_name: Optional[str] = None
    verification_result: str
    status: str
    created_at: datetime