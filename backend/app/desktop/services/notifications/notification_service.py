from uuid import UUID
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.notifications import Notification
from app.models.users import User
from app.core.user_display import format_officer_display_name  # ADDED import
from sqlalchemy import text


# Mirrors the Priority enum in schemas/drafts/drafts.py — kept here as
# plain strings since Notification has no priority column of its own;
# the deadline context is baked directly into the message text instead.
PRIORITY_LABELS = {
    "standard": "Standard",
    "high": "High — respond within 48 hours",
    "urgent": "Urgent — respond within 24 hours",
    "critical": "Critical — respond within 1 hour",
}


def _priority_label(priority: str | None) -> str:
    if priority is None:
        return "Standard"
    return PRIORITY_LABELS.get(priority, priority.title())



def _user_ids_for_role_in_region(db: Session, role: str, region_id: UUID, exclude_user_id: UUID | None = None) -> list[UUID]:  # CHANGED
    """Cross-agency lookup for notification fan-out. RLS on users hides the
    other agency's rows, so bypass it for this one query only."""
    prev = db.execute(text("select current_setting('app.bypass_rls', true)")).scalar()
    db.execute(text("select set_config('app.bypass_rls', 'true', true)"))
    try:
        query = db.query(User.user_id).filter(User.role == role, User.region_id == region_id)
        if exclude_user_id is not None:  # ADDED
            query = query.filter(User.user_id != exclude_user_id)  # ADDED
        rows = query.all()
    finally:
        db.execute(text("select set_config('app.bypass_rls', :v, true)"), {"v": prev or "false"})
    return [r.user_id for r in rows]


def _get_fda_user_ids_for_region(db: Session, region_id: UUID, exclude_user_id: UUID | None = None) -> list[UUID]:  # CHANGED
    return _user_ids_for_role_in_region(db, "fda_personnel", region_id, exclude_user_id)


def _get_lea_user_ids_for_region(db: Session, region_id: UUID, exclude_user_id: UUID | None = None) -> list[UUID]:  # CHANGED
    return _user_ids_for_role_in_region(db, "lea_personnel", region_id, exclude_user_id)

def _bulk_create_personnel_notifications(
    db: Session,
    user_ids: Iterable[UUID],
    complaint_id: UUID | None,
    title: str,
    message: str,
) -> None:
    for user_id in user_ids:
        db.add(Notification(
            recipient_type="personnel",
            user_id=user_id,
            complaint_id=complaint_id,
            title=title,
            message=message,
        ))


# ── FDA-side notifications triggered by LEA actions ─────────────────────

def notify_fda_new_verification_request(db: Session, complaint, priority: str) -> None:
    label = _priority_label(priority)
    fda_user_ids = _get_fda_user_ids_for_region(db, complaint.region_id)
    _bulk_create_personnel_notifications(
        db, fda_user_ids, complaint.complaint_id,
        title=f"New Verification Request — {label.split(' —')[0]} Priority",
        message=(
            f"LEA-CIDG submitted a verification request for CASE ID: "
            f"{complaint.case_reference}. Priority: {label}."
        ),
    )


def notify_fda_reminder_sent(db: Session, complaint, priority: str) -> None:
    label = _priority_label(priority)
    fda_user_ids = _get_fda_user_ids_for_region(db, complaint.region_id)
    _bulk_create_personnel_notifications(
        db, fda_user_ids, complaint.complaint_id,
        title="Reminder: Verification Request Pending",
        message=(
            f"LEA-CIDG sent a reminder for CASE ID: {complaint.case_reference}. "
            f"Priority: {label}."
        ),
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


def notify_fda_takedown_initiated(db: Session, complaint) -> None:  # ADDED
    fda_user_ids = _get_fda_user_ids_for_region(db, complaint.region_id)
    _bulk_create_personnel_notifications(
        db, fda_user_ids, complaint.complaint_id,
        title="Takedown Operation Initiated",
        message=f"LEA-CIDG initiated a takedown operation for CASE ID: {complaint.case_reference}.",
    )




# ── LEA-side notifications triggered by FDA actions ──────────────────────

def notify_lea_fda_responded(db: Session, complaint) -> None:  # CHANGED — replaces notify_lea_fda_registered + notify_lea_fda_unregistered
    lea_user_ids = _get_lea_user_ids_for_region(db, complaint.region_id)
    _bulk_create_personnel_notifications(
        db, lea_user_ids, complaint.complaint_id,
        title="FDA Response Received",
        message=(
            f"FDA has responded to the verification request for CASE ID: "
            f"{complaint.case_reference}. Check the FDA Response tab for details."
        ),
    )


def notify_lea_fda_rejected(db: Session, complaint, verification_request) -> None:  # ADDED
    lea_user_ids = _get_lea_user_ids_for_region(db, complaint.region_id)
    _bulk_create_personnel_notifications(
        db, lea_user_ids, complaint.complaint_id,
        title="Verification Request Rejected by FDA",
        message=(
            f"FDA rejected the verification request for CASE ID: {complaint.case_reference}. "
            f"Reason: {verification_request.rejection_reason}."
        ),
    )


def notify_lea_new_walkin_complaint(db: Session, complaint, current_user) -> None:  # CHANGED — added current_user param
    officer_name = format_officer_display_name(current_user)
    lea_user_ids = _get_lea_user_ids_for_region(db, complaint.region_id)  
    _bulk_create_personnel_notifications(
        db, lea_user_ids, complaint.complaint_id,
        title="New Complaint Logged",
        message=f"{officer_name} logged a new walk-in complaint — CASE ID: {complaint.case_reference}.",
    )


# ── SLA reminder notifications (priority-based, triggered by polling) ────

def notify_fda_sla_reminder_1(db: Session, complaint, priority: str, remaining_str: str, is_late: bool = False) -> None:
    priority_name = priority.capitalize()
    fda_user_ids = _get_fda_user_ids_for_region(db, complaint.region_id)
    if is_late:
        message = (
            f"CASE ID: {complaint.case_reference} should have already received a response. "
            f"Priority: {priority_name} — the response deadline has passed."
        )
    else:
        message = (
            f"CASE ID: {complaint.case_reference} is approaching its response deadline. "
            f"Priority: {priority_name} — respond within {remaining_str}."
        )
    _bulk_create_personnel_notifications(
        db, fda_user_ids, complaint.complaint_id,
        title="Response Needed Soon",
        message=message,
    )


def notify_fda_sla_reminder_2(db: Session, complaint, priority: str, remaining_str: str, is_late: bool = False) -> None:
    priority_name = priority.capitalize()
    fda_user_ids = _get_fda_user_ids_for_region(db, complaint.region_id)
    if is_late:
        message = (
            f"CASE ID: {complaint.case_reference} should have already received a response. "
            f"Priority: {priority_name} — the response deadline has passed."
        )
    else:
        message = (
            f"CASE ID: {complaint.case_reference} is very close to its response deadline. "
            f"Priority: {priority_name} — respond within {remaining_str}."
        )
    _bulk_create_personnel_notifications(
        db, fda_user_ids, complaint.complaint_id,
        title="Deadline Approaching — Respond Now",
        message=message,
    )


def notify_fda_sla_breach(db: Session, complaint, priority: str) -> None:
    priority_name = priority.capitalize()
    fda_user_ids = _get_fda_user_ids_for_region(db, complaint.region_id)
    _bulk_create_personnel_notifications(
        db, fda_user_ids, complaint.complaint_id,
        title="Response Deadline Missed",
        message=(
            f"CASE ID: {complaint.case_reference} has missed its response deadline. "
            f"Priority: {priority_name} — response overdue."
        ),
    )




# ── LEA "team activity" — now includes the acting officer too, so this
# doubles as a personal + team audit trail on the LEA side. ─────────────

def notify_lea_peers_verification_sent(db: Session, complaint, priority: str, current_user) -> None:
    label = _priority_label(priority)
    officer_name = format_officer_display_name(current_user)
    lea_ids = _get_lea_user_ids_for_region(db, complaint.region_id)  # CHANGED — no exclude_user_id
    _bulk_create_personnel_notifications(
        db, lea_ids, complaint.complaint_id,
        title="Verification Request Sent",
        message=f"{officer_name} sent a verification request for CASE ID: {complaint.case_reference}. Priority: {label}.",
    )


def notify_lea_peers_reminder_sent(db: Session, complaint, priority: str, current_user) -> None:
    label = _priority_label(priority)
    officer_name = format_officer_display_name(current_user)
    lea_ids = _get_lea_user_ids_for_region(db, complaint.region_id)  # CHANGED
    _bulk_create_personnel_notifications(
        db, lea_ids, complaint.complaint_id,
        title="Reminder Sent",
        message=f"{officer_name} sent a reminder for CASE ID: {complaint.case_reference}. Priority: {label}.",
    )


def notify_lea_peers_request_recalled(db: Session, complaint, current_user) -> None:
    officer_name = format_officer_display_name(current_user)
    lea_ids = _get_lea_user_ids_for_region(db, complaint.region_id)  # CHANGED
    _bulk_create_personnel_notifications(
        db, lea_ids, complaint.complaint_id,
        title="Verification Request Recalled",
        message=f"{officer_name} recalled the verification request for CASE ID: {complaint.case_reference}.",
    )


def notify_lea_peers_acknowledged(db: Session, complaint, current_user) -> None:
    officer_name = format_officer_display_name(current_user)
    lea_ids = _get_lea_user_ids_for_region(db, complaint.region_id)  # CHANGED
    _bulk_create_personnel_notifications(
        db, lea_ids, complaint.complaint_id,
        title="FDA Response Acknowledged",
        message=f"{officer_name} acknowledged the FDA response for CASE ID: {complaint.case_reference}.",
    )


def notify_lea_peers_takedown_initiated(db: Session, complaint, current_user) -> None:
    officer_name = format_officer_display_name(current_user)
    lea_ids = _get_lea_user_ids_for_region(db, complaint.region_id)  # CHANGED
    _bulk_create_personnel_notifications(
        db, lea_ids, complaint.complaint_id,
        title="Takedown Operation Initiated",
        message=f"{officer_name} initiated a takedown operation for CASE ID: {complaint.case_reference}.",
    )


def notify_lea_peers_case_closed(db: Session, complaint, current_user) -> None:
    officer_name = format_officer_display_name(current_user)
    lea_ids = _get_lea_user_ids_for_region(db, complaint.region_id)  # CHANGED
    _bulk_create_personnel_notifications(
        db, lea_ids, complaint.complaint_id,
        title="Case Closed",
        message=f"{officer_name} closed CASE ID: {complaint.case_reference}.",
    )


# ── FDA "team activity" — same change, includes the acting officer. ─────

def notify_fda_peers_responded(db: Session, complaint, current_user) -> None:
    officer_name = format_officer_display_name(current_user)
    fda_ids = _get_fda_user_ids_for_region(db, complaint.region_id)  # CHANGED
    _bulk_create_personnel_notifications(
        db, fda_ids, complaint.complaint_id,
        title="Verification Response Submitted",
        message=f"{officer_name} submitted a response for CASE ID: {complaint.case_reference}. Check the queue for details.",
    )


def notify_fda_peers_rejected(db: Session, complaint, current_user) -> None:
    officer_name = format_officer_display_name(current_user)
    fda_ids = _get_fda_user_ids_for_region(db, complaint.region_id)  # CHANGED
    _bulk_create_personnel_notifications(
        db, fda_ids, complaint.complaint_id,
        title="Verification Request Rejected",
        message=f"{officer_name} rejected the verification request for CASE ID: {complaint.case_reference}.",
    )