from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.models.walkin_intake_drafts import WalkinIntakeDraft
from app.models.verification_request_drafts import VerificationRequestDraft
from app.models.complaints import Complaint
from app.models.walkin_complainants import WalkinComplainant
from app.desktop.schemas.drafts.drafts import (
    UnifiedDraftResponse, DraftStatus, DraftType, SortOption,
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/drafts", tags=["All Drafts"])


@router.get("/", response_model=list[UnifiedDraftResponse])
def list_all_drafts(
    draft_type: DraftType | None = Query(None),
    status: DraftStatus | None = Query(None),
    search: str | None = Query(None),
    sort: SortOption = Query(SortOption.recently_edited),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    results: list[UnifiedDraftResponse] = []

    # Every draft returned here is guaranteed to belong to current_user
    # (both queries below filter by saved_by == current_user.user_id),
    # so we can build this ONCE instead of looking it up per-row.
    officer_full_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or None

    # --- Walk-in intake drafts ---
    # Skipped entirely if the officer filtered to "Verification Request"
    # only — no reason to query a table we're not going to show.
    if draft_type in (None, DraftType.walkin):
        q = db.query(WalkinIntakeDraft).filter(
            WalkinIntakeDraft.saved_by == current_user.user_id
        )
        if status is not None:
            q = q.filter(WalkinIntakeDraft.draft_status == status)
        if search is not None:
            q = q.filter(WalkinIntakeDraft.product_name.ilike(f"%{search}%"))

        for d in q.all():
            results.append(UnifiedDraftResponse(
                draft_id=d.draft_id,
                draft_type=DraftType.walkin,
                product_name=d.product_name,
                manufacturer=d.manufacturer,
                product_category=d.product_category,
                complainant_name=d.full_name,
                saved_by=d.saved_by,
                # this approach works specifically because of the current privacy scoping. 
                # If this endpoint ever gets extended later (e.g., a supervisor view that can see multiple officers' drafts), 
                # this shortcut would break silently — it would show the viewing supervisor's name on every row, 
                # not each draft's actual owner. If that day comes, this would need to become a real join instead
                saved_by_name=officer_full_name, 
                region_id=d.region_id,
                draft_status=d.draft_status,
                created_at=d.created_at,
                updated_at=d.updated_at,
            ))

    # --- Verification request drafts ---
    # These carry almost no display data themselves — product name,
    # manufacturer, category, and complainant all live on the linked
    # Complaint (and, for complainant, one hop further on
    # WalkinComplainant). outerjoin on WalkinComplainant because
    # complaint.complainant_id is nullable — complaints sourced from
    # the browser extension have no walk-in complainant at all.
    if draft_type in (None, DraftType.verification):
        q = db.query(VerificationRequestDraft, Complaint, WalkinComplainant).join(
            Complaint, VerificationRequestDraft.complaint_id == Complaint.complaint_id
        ).outerjoin(
            WalkinComplainant, Complaint.complainant_id == WalkinComplainant.complainant_id
        ).filter(
            VerificationRequestDraft.saved_by == current_user.user_id
        )
        if status is not None:
            q = q.filter(VerificationRequestDraft.draft_status == status)
        if search is not None:
            # Search hits the complaint's product_title, since
            # VerificationRequestDraft has no product_name column
            # of its own.
            q = q.filter(Complaint.product_title.ilike(f"%{search}%"))

        for draft, complaint, complainant in q.all():
            results.append(UnifiedDraftResponse(
                draft_id=draft.draft_id,
                draft_type=DraftType.verification,
                product_name=complaint.product_title,
                manufacturer=complaint.manufacturer,
                product_category=complaint.product_category,
                complainant_name=complainant.full_name if complainant else None,
                saved_by=draft.saved_by,
                saved_by_name=officer_full_name,
                region_id=draft.region_id,
                draft_status=draft.draft_status,
                created_at=draft.created_at,
                updated_at=draft.updated_at,
            ))

    if sort == SortOption.recently_edited:
        results.sort(key=lambda r: r.updated_at, reverse=True)
    elif sort == SortOption.oldest_first:
        results.sort(key=lambda r: r.updated_at, reverse=False)
    elif sort == SortOption.product_name_az:
        # product_name can be None on either draft type in theory —
        # sorting with a None mixed among strings would crash, so we
        # fall back to an empty string for comparison purposes only
        results.sort(key=lambda r: (r.product_name or "").lower())

    return results