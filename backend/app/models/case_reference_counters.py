from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database.base import Base


class CaseReferenceCounter(Base):
    __tablename__ = "case_reference_counters"

    region_id = Column(UUID(as_uuid=True), ForeignKey("regions.region_id"), primary_key=True)
    year = Column(Integer, primary_key=True)
    last_number = Column(Integer, nullable=False, default=0)