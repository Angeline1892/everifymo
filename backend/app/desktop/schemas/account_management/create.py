from pydantic import BaseModel, EmailStr, Field
from typing import Literal
import uuid


class CreateAdminRequest(BaseModel):
    """National Admin -> creates an Admin (FDA or LEA-CIDG)"""
    first_name: str = Field(..., min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    contact_number: str | None = Field(None, max_length=20)
    employee_id: str | None = Field(None, max_length=50)
    position: str | None = Field(None, max_length=150)
    department: str | None = Field(None, max_length=150)
    region_id: uuid.UUID
    agency: Literal["FDA", "LEA-CIDG"]


class CreateNationalAdminRequest(BaseModel):
    """National Admin -> creates a fellow National Admin"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr


class CreateFellowAdminRequest(BaseModel):
    """Agency Admin -> creates a fellow Admin in the SAME agency+region.
    Deliberately has no region_id/agency field — backend derives both from the actor."""
    first_name: str = Field(..., min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    contact_number: str | None = Field(None, max_length=20)
    employee_id: str | None = Field(None, max_length=50)
    position: str | None = Field(None, max_length=150)
    department: str | None = Field(None, max_length=150)


class CreatePersonnelRequest(BaseModel):
    """Agency Admin -> creates Personnel in the SAME agency+region."""
    first_name: str = Field(..., min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    contact_number: str | None = Field(None, max_length=20)
    employee_id: str | None = Field(None, max_length=50)
    position: str | None = Field(None, max_length=150)
    department: str | None = Field(None, max_length=150)


class EditPersonnelInfoRequest(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    contact_number: str | None = Field(None, max_length=20)
    employee_id: str | None = Field(None, max_length=50)
    position: str | None = Field(None, max_length=150)
    department: str | None = Field(None, max_length=150)