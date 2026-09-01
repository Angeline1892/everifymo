from fastapi import HTTPException

from app.core.constants import VALID_COMPLAINT_TRANSITIONS
from app.models.complaints import Complaint


def transition_complaint_status(complaint: Complaint, new_status: str) -> None:
    """
    Safely moves a complaint from its current status to a new one,
    checking VALID_COMPLAINT_TRANSITIONS first. Raises a clear error
    if the jump isn't allowed, instead of silently letting a complaint
    skip steps or leave a dead-end status like 'dismissed'.

    Does NOT commit — same reasoning as generate_case_reference —
    the caller controls when this becomes permanent, so it can be
    part of a larger all-or-nothing transaction.
    """
    allowed_next_statuses = VALID_COMPLAINT_TRANSITIONS[complaint.source][complaint.status]

    if new_status not in allowed_next_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot move complaint from '{complaint.status}' to "
                f"'{new_status}' for source '{complaint.source}'."
            ),
        )

    complaint.status = new_status