from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from typing import Optional

class ToPrintStatus(BaseModel):
    model_config = ConfigDict(from_attribute=True)

    complaint_id: UUID
    product_title: str
    new_status: str
    history_id: Optional[UUID] = None
    change_note: Optional[str] = None
    changed_at: datetime
    platform: str
    product_url: Optional[str] = None
    store_name: Optional[str] = None
    consumer_description: str
    created_at: datetime
