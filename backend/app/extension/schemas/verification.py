from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class CreateVerification(BaseModel):
    product_title: str
    platform: str
    verification_result: str 

class ToPrintVerification(BaseModel):
    history_id: UUID
    product_title: str
    platform: str
    verification_result: str 
    checked_at: datetime