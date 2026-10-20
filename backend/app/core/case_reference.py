from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def generate_case_reference(db: Session, region_id: UUID) -> str:
    current_year = datetime.now(timezone.utc).year

    # We need the region's short code (e.g. "R4A") for the visible
    # string — region_id alone is a UUID, not human-readable.
    region_row = db.execute(
        text("SELECT region_code FROM regions WHERE region_id = :region_id"),
        {"region_id": region_id},
    ).first()

    if region_row is None:
        # Defensive check — should never actually happen in practice,
        # since region_id always comes from a real logged-in officer's
        # token, which always points at a real region row. But if it
        # somehow did, better to fail loudly here than silently build
        # a broken case number.
        raise ValueError(f"No region found for region_id: {region_id}")

    region_code = region_row.region_code

    # Same locking idea as before, but now scoped to BOTH region_id
    # AND year together — Region 4's counter and Region 3's counter
    # are now two completely separate rows, independently locked and
    # independently incremented.
    row = db.execute(
        text(
            "SELECT last_number FROM case_reference_counters "
            "WHERE region_id = :region_id AND year = :year FOR UPDATE"
        ),
        {"region_id": region_id, "year": current_year},
    ).first()

    if row is None:
        db.execute(
            text(
                "INSERT INTO case_reference_counters (region_id, year, last_number) "
                "VALUES (:region_id, :year, 1)"
            ),
            {"region_id": region_id, "year": current_year},
        )
        next_number = 1
    else:
        next_number = row.last_number + 1
        db.execute(
            text(
                "UPDATE case_reference_counters SET last_number = :next "
                "WHERE region_id = :region_id AND year = :year"
            ),
            {"next": next_number, "region_id": region_id, "year": current_year},
        )

    return f"ICM-{region_code}-{current_year}-{str(next_number).zfill(5)}"