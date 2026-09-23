# backend/app/desktop/services/complaints/fda_dashboard_service.py
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.complaints import Complaint
from app.models.verification_requests import VerificationRequest
from app.desktop.schemas.complaints.complaints import (
    FdaDashboardStatsResponse,
    FdaDashboardAwaitingCase,
    FdaDashboardRecentComplaint
)


def get_fda_dashboard_stats(db: Session, current_user) -> FdaDashboardStatsResponse:
    region_id = current_user.region_id

    # Query all active complaints in user's region
    complaints = db.query(Complaint).filter(
        Complaint.region_id == region_id,
        Complaint.deleted_at.is_(None)
    ).all()

    browser_extension_count = 0
    walk_in_count = 0
    takedowns_completed_count = 0

    # Trend line chart arrays (12 months: Jan to Dec)
    trend_browser_values = [0] * 12
    trend_walkin_values = [0] * 12

    # Takedown bar chart arrays
    takedown_requested_values = [0] * 12
    takedown_completed_values = [0] * 12

    # Category mix counters
    category_counts = {
        "Cosmetics": 0,
        "Food": 0,
        "Drugs": 0,
        "Med Device": 0
    }

    for c in complaints:
        # Determine source count and update line chart values
        if c.source == 'extension':
            browser_extension_count += 1
            if c.created_at:
                month_idx = c.created_at.month - 1
                if 0 <= month_idx < 12:
                    trend_browser_values[month_idx] += 1
        elif c.source == 'walk_in':
            walk_in_count += 1
            if c.created_at:
                month_idx = c.created_at.month - 1
                if 0 <= month_idx < 12:
                    trend_walkin_values[month_idx] += 1

        # Count completed takedowns
        if c.status == 'completed':
            takedowns_completed_count += 1

        # Update category counts
        cat = c.product_category
        if cat == "Cosmetics":
            category_counts["Cosmetics"] += 1
        elif cat in ["Food", "Supplement"]:
            category_counts["Food"] += 1
        elif cat in ["Pharmaceutical", "Drugs"]:
            category_counts["Drugs"] += 1
        elif cat in ["Medical Device", "Med Device", "Devices", "Medical Devices"]:
            category_counts["Med Device"] += 1

        # Update takedown bar chart values
        if c.created_at:
            month_idx = c.created_at.month - 1
            if 0 <= month_idx < 12:
                if c.status in ['takedown_requested', 'takedown_initiated', 'completed']:
                    takedown_requested_values[month_idx] += 1
                if c.status == 'completed':
                    takedown_completed_values[month_idx] += 1

    # Formulate category mix response
    total_mix_count = sum(category_counts.values()) or 1
    category_mix = [
        {"label": "Cosmetics", "value": category_counts["Cosmetics"], "color": "#2563eb"},
        {"label": "Food", "value": category_counts["Food"], "color": "#10b981"},
        {"label": "Drugs", "value": category_counts["Drugs"], "color": "#06b6d4"},
        {"label": "Med Device", "value": category_counts["Med Device"], "color": "#f59e0b"}
    ]

    # Query awaiting verification cases (pending requests)
    awaiting_requests = (
        db.query(VerificationRequest, Complaint)
        .join(Complaint, VerificationRequest.complaint_id == Complaint.complaint_id)
        .filter(
            VerificationRequest.verification_request_status == "pending",
            Complaint.region_id == region_id,
            Complaint.deleted_at.is_(None)
        )
        .order_by(VerificationRequest.requested_at.desc())
        .all()
    )

    awaiting_list = []
    for req, comp in awaiting_requests:
        awaiting_list.append(
            FdaDashboardAwaitingCase(
                id=req.request_id,
                product=req.product_name,
                manufacturer=comp.manufacturer,
                caseId=comp.case_reference,
                status="Pending Verification",
                leaConfirmation=True
            )
        )

    # Query recent complaint activities (last 6)
    recent_db_complaints = (
        db.query(Complaint)
        .filter(
            Complaint.region_id == region_id,
            Complaint.deleted_at.is_(None)
        )
        .order_by(Complaint.created_at.desc())
        .limit(6)
        .all()
    )

    recent_list = []
    for comp in recent_db_complaints:
        # Map statuses to user friendly names
        if comp.status == "open":
            status_label = "Pending Verification"
        elif comp.status == "under_review":
            status_label = "Under Review"
        elif comp.status == "takedown_requested":
            status_label = "Forwarded to LEA"
        elif comp.status == "takedown_initiated":
            status_label = "Operation in Progress"
        elif comp.status == "completed":
            status_label = "Takedown Completed"
        elif comp.status == "dismissed":
            status_label = "Case Closed"
        else:
            status_label = comp.status

        recent_list.append(
            FdaDashboardRecentComplaint(
                id=comp.complaint_id,
                caseId=comp.case_reference,
                product=comp.product_title,
                manufacturer=comp.manufacturer,
                source="Browser Extension" if comp.source == "extension" else "Walk-in",
                status=status_label,
                dateReceived=comp.created_at.strftime("%Y-%m-%d %H:%M") if comp.created_at else "—"
            )
        )

    trend_months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    return FdaDashboardStatsResponse(
        browser_extension_count=browser_extension_count,
        walk_in_count=walk_in_count,
        takedowns_completed_count=takedowns_completed_count,
        trend_months=trend_months,
        trend_browser_values=trend_browser_values,
        trend_walkin_values=trend_walkin_values,
        takedown_requested_values=takedown_requested_values,
        takedown_completed_values=takedown_completed_values,
        category_mix=category_mix,
        awaiting_verification=awaiting_list,
        recent_complaints=recent_list
    )
