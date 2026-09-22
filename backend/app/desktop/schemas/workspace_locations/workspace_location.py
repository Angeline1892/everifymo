# backend/app/desktop/schemas/workspace_locations/workspace_location.py
from datetime import datetime
from decimal import Decimal
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class WorkspaceLocationBase(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    radius_meters: int = Field(500, gt=0, description="Geofence radius in meters, defaults to 500")


class WorkspaceLocationCreateOrUpdateRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    radius_meters: int = Field(500, gt=0, description="Geofence radius in meters, must be > 0")

    @field_validator("latitude", mode="before")
    @classmethod
    def parse_lat(cls, v):
        if v is None or v == "":
            raise ValueError("Latitude is required.")
        return float(v)

    @field_validator("longitude", mode="before")
    @classmethod
    def parse_lng(cls, v):
        if v is None or v == "":
            raise ValueError("Longitude is required.")
        return float(v)

    @field_validator("radius_meters", mode="before")
    @classmethod
    def parse_radius(cls, v):
        if v is None or v == "":
            return 500
        val = int(round(float(v)))
        if val <= 0:
            raise ValueError("Geofence radius must be greater than 0 meters.")
        return val


class WorkspaceLocationResponse(BaseModel):
    workspace_location_id: Optional[UUID] = None
    agency: str
    region: Optional[str] = None
    region_id: Optional[UUID] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: Optional[int] = 500
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True


class PersonnelLocationLogCreate(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    source: Literal["gps", "ip"] = "gps"


class PersonnelLocationLogResponse(BaseModel):
    log_id: UUID
    personnel_id: UUID
    workspace_location_id: Optional[UUID] = None
    session_id: Optional[UUID] = None
    latitude: float
    longitude: float
    distance_meters: Optional[int] = None
    is_anomaly: bool
    source: str
    created_at: datetime

    class Config:
        from_attributes = True
