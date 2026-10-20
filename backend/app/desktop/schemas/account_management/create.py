from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal
import uuid

ALLOWED_EMAIL_DOMAINS = {
    "gmail.com",
    "fda.gov.ph",
    "pnp.gov.ph",
}

NAME_PATTERN = r"^[A-Za-zÀ-ÖØ-öø-ÿ'.\- ]+$"


def validate_allowed_domain(email: str) -> str:
    domain = email.rsplit("@", 1)[-1].lower()
    if domain not in ALLOWED_EMAIL_DOMAINS:
        allowed = ", ".join(sorted(ALLOWED_EMAIL_DOMAINS))
        raise ValueError(
            f"Email domain '{domain}' is not allowed. Allowed domains: {allowed}"
        )
    return email


class CreateAdminRequest(BaseModel):
    """National Admin -> creates an Admin (FDA or LEA-CIDG)"""
    first_name: str = Field(..., min_length=1, max_length=50, pattern=NAME_PATTERN)
    middle_name: str | None = Field(None, max_length=50, pattern=NAME_PATTERN)
    last_name: str = Field(..., min_length=1, max_length=50, pattern=NAME_PATTERN)
    email: EmailStr = Field(max_length=254)
    contact_number: str | None = Field(None, min_length=11, max_length=11, pattern=r"^09\d{9}$")
    employee_id: str | None = Field(None, max_length=20)
    position: str | None = Field(None, max_length=150)
    department: str | None = Field(None, max_length=150)
    region_id: uuid.UUID
    agency: Literal["FDA", "LEA-CIDG"]

    _check_domain = field_validator("email")(validate_allowed_domain)


class CreateNationalAdminRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50, pattern=NAME_PATTERN)
    last_name: str = Field(..., min_length=1, max_length=50, pattern=NAME_PATTERN)
    email: EmailStr = Field(max_length=254)

    _check_domain = field_validator("email")(validate_allowed_domain)


class CreateFellowAdminRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50, pattern=NAME_PATTERN)
    middle_name: str | None = Field(None, max_length=50, pattern=NAME_PATTERN)
    last_name: str = Field(..., min_length=1, max_length=50, pattern=NAME_PATTERN)
    email: EmailStr = Field(max_length=254)
    contact_number: str | None = Field(None, min_length=11, max_length=11, pattern=r"^09\d{9}$")
    employee_id: str | None = Field(None, max_length=20)
    position: str | None = Field(None, max_length=150)
    department: str | None = Field(None, max_length=150)

    _check_domain = field_validator("email")(validate_allowed_domain)


class CreatePersonnelRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50, pattern=NAME_PATTERN)
    middle_name: str | None = Field(None, max_length=50, pattern=NAME_PATTERN)
    last_name: str = Field(..., min_length=1, max_length=50, pattern=NAME_PATTERN)
    email: EmailStr = Field(max_length=254)
    contact_number: str | None = Field(None, min_length=11, max_length=11, pattern=r"^09\d{9}$")
    employee_id: str | None = Field(None, max_length=20)
    position: str | None = Field(None, max_length=150)
    department: str | None = Field(None, max_length=150)

    _check_domain = field_validator("email")(validate_allowed_domain)


class EditPersonnelInfoRequest(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=50, pattern=NAME_PATTERN)
    middle_name: str | None = Field(None, max_length=50, pattern=NAME_PATTERN)
    last_name: str | None = Field(None, min_length=1, max_length=50, pattern=NAME_PATTERN)
    contact_number: str | None = Field(None, min_length=11, max_length=11, pattern=r"^09\d{9}$")
    employee_id: str | None = Field(None, max_length=20)
    position: str | None = Field(None, max_length=150)
    department: str | None = Field(None, max_length=150)