from pydantic import BaseModel
import uuid


class RegionOut(BaseModel):
    region_id: uuid.UUID
    region_name: str
    region_code: str

    class Config:
        from_attributes = True