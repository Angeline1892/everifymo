from uuid import UUID
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.notifications import Notification
from app.models.users import User


def _get_fda_user_ids_for_region(db: Session, region_id: UUID) -> list[UUID]:
    """
    FDA personnel are notified per-region: anyone with role == 'fda'
    in the same region_id as the complaint that triggered the event.
    """
    rows = (
        db.query(User.user_id)
        .filter(User.role == "fda", User.region_id == region_id)
        .all()
    )
    return [r.user_id for r in rows]


def _bulk_create_personnel_notifications(
    db: Session,
    user_ids: Iterable[UUID],
    complaint_id: UUID | None,
    title: str,
    message: str,
) -> None:
    """
    Adds one Notification row per recipient. Does NOT commit — rides
    in the same transaction as whatever status change triggered it,
    so a notification is never created for a change that then fails.
    """
    for user_id in user_ids:
        db.add(Notification(
            recipient_type="personnel",
            user_id=user_id,
            complaint_id=complaint_id,
            title=title,
            message=message,
        ))


# ── FDA-side notifications triggered by LEA actions ─────────────────────

def notify_fda_new_verification_request(db: Session, complaint) -> None:
    fda_user_ids = _get_fda_user_ids_for_region(db, complaint.region_id)
    _bulk_create_personnel_notifications(
        db, fda_user_ids, complaint.complaint_id,
        title="New Verification Request",
        message=f"LEA-CIDG submitted a verification request for CASE ID: {complaint.case_reference}.",
    )


def notify_fda_reminder_sent(db: Session, complaint) -> None:
    fda_user_ids = _get_fda_user_ids_for_region(db, complaint.region_id)
    _bulk_create_personnel_notifications(
        db, fda_user_ids, complaint.complaint_id,
        title="Reminder: Verification Request Pending",
        message=f"LEA-CIDG sent a reminder for CASE ID: {complaint.case_reference}.",
    )


def notify_fda_request_recalled(db: Session, complaint) -> None:
    fda_user_ids = _get_fda_user_ids_for_region(db, complaint.region_id)
    _bulk_create_personnel_notifications(
        db, fda_user_ids, complaint.complaint_id,
        title="Verification Request Recalled",
        message=f"LEA-CIDG recalled the verification request for CASE ID: {complaint.case_reference}.",
    )


def notify_fda_lea_acknowledged(db: Session, complaint) -> None:
    fda_user_ids = _get_fda_user_ids_for_region(db, complaint.region_id)
    _bulk_create_personnel_notifications(
        db, fda_user_ids, complaint.complaint_id,
        title="LEA Acknowledged FDA Response",
        message=f"LEA-CIDG acknowledged your response for CASE ID: {complaint.case_reference}.",
    )


def notify_fda_case_closed(db: Session, complaint) -> None:
    fda_user_ids = _get_fda_user_ids_for_region(db, complaint.region_id)
    _bulk_create_personnel_notifications(
        db, fda_user_ids, complaint.complaint_id,
        title="Case Closed by LEA",
        message=f"LEA-CIDG closed CASE ID: {complaint.case_reference}.",
    )