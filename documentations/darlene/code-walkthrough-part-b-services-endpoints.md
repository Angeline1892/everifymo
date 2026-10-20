# Code Walkthrough — Part B: Services & Endpoints

Continued from Part A. Same format: file path, then each function/endpoint explained in plain language, with the important syntax pointed out.

---

## File: `app/desktop/services/complaints/complaint_detail_service.py`

```python
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.complaints import Complaint
from app.models.walkin_complainants import WalkinComplainant
from app.models.shared_files import SharedFile
from app.desktop.schemas.complaints.complaints import (
    ComplaintVerificationDetailResponse,
    SharedFileResponse,
)


def get_complaint_verification_detail(db: Session, complaint_id: UUID, region_id: UUID) -> ComplaintVerificationDetailResponse:
    result = db.query(Complaint, WalkinComplainant).outerjoin(
        WalkinComplainant, Complaint.complainant_id == WalkinComplainant.complainant_id
    ).filter(
        Complaint.complaint_id == complaint_id,
        Complaint.region_id == region_id,
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    complaint, complainant = result

    files = db.query(SharedFile).filter(SharedFile.complaint_id == complaint_id).all()

    return ComplaintVerificationDetailResponse(
        complaint_id=complaint.complaint_id,
        case_reference=complaint.case_reference,
        product_title=complaint.product_title,
        manufacturer=complaint.manufacturer,
        product_category=complaint.product_category,
        complainant_name=complainant.full_name if complainant else None,
        created_at=complaint.created_at,
        source=complaint.source,
        attached_files=[SharedFileResponse.model_validate(f) for f in files],
    )
```

**What this whole function is for:** it's a "gather everything about this complaint" function. Given a complaint's ID, it fetches the complaint itself, whoever complained (if anyone), and every file attached to it — then packages it all into one tidy object. This function is called from TWO different endpoints (Case 1 and Case 2), so the actual gathering logic only lives here, once.

**Line by line, the interesting parts:**

`db.query(Complaint, WalkinComplainant)` — asking for TWO tables at once, meaning each result comes back as a pair (a "tuple") instead of a single object.

`.outerjoin(WalkinComplainant, Complaint.complainant_id == WalkinComplainant.complainant_id)` — "match up complaints with their complainants, WHERE they exist, but keep the complaint even if there's no matching complainant." A regular `.join()` would instead silently DROP any complaint that has no linked complainant — which would be wrong, since some complaints (especially extension-sourced ones) genuinely have none.

`.filter(Complaint.complaint_id == complaint_id, Complaint.region_id == region_id)` — two conditions joined by a comma inside one `.filter()` call means BOTH must be true (an "AND"). This is the region-security fix from the audit — without the second condition, an officer could fetch ANY region's complaint detail just by knowing its ID.

`.first()` — get just the first (and only expected) matching pair, or `None` if nothing matched.

`if not result: raise HTTPException(...)` — if nothing was found (either the complaint doesn't exist, OR it exists but belongs to a different region), stop and say "not found" — deliberately not distinguishing between those two cases in the error message, so nobody can use the error itself to figure out that a complaint exists somewhere they're not allowed to see.

`complaint, complainant = result` — since `result` is a pair (a tuple with two things in it), this line "unpacks" it into two separate named variables in one step, instead of writing `result[0]` and `result[1]`.

`files = db.query(SharedFile).filter(SharedFile.complaint_id == complaint_id).all()` — a completely separate, second query, just fetching every file tied to this complaint.

`complainant_name=complainant.full_name if complainant else None` — a one-line if/else. Read right to left: "use `complainant.full_name`, UNLESS `complainant` is empty/`None`, in which case just use `None` instead." This protects against crashing when there genuinely is no linked complainant (the exact case the outer join was built to allow).

`attached_files=[SharedFileResponse.model_validate(f) for f in files]` — a **list comprehension**. It loops through every item in `files` (each one a raw `SharedFile` database row), and for EACH one, converts it into a proper `SharedFileResponse` object using `.model_validate(f)` — which is Pydantic's way of saying "read this object's attributes and build a schema instance from them," the explicit, one-at-a-time version of what `from_attributes=True` does automatically for a single object.

---

## File: `app/desktop/services/verification/verification_submit_service.py`

```python
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.verification_request_drafts import VerificationRequestDraft
from app.models.verification_requests import VerificationRequest
from app.models.complaints import Complaint

from app.core.complaint_status import transition_complaint_status


def _create_verification_request(
    db: Session,
    current_user,
    complaint_id: UUID,
    product_code: str | None,
    priority: str,
    complaint_statement: str,
    region_id: UUID,
) -> VerificationRequest:
    complaint = db.query(Complaint).filter(
        Complaint.complaint_id == complaint_id,
        Complaint.region_id == region_id,
    ).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Linked complaint not found.")

    transition_complaint_status(complaint, "under_review")

    new_request = VerificationRequest(
        complaint_id=complaint_id,
        requested_by=current_user.user_id,
        product_name=complaint.product_title,
        product_code=product_code,
        complaint_statement=complaint_statement,
        verification_request_status="pending",
        priority=priority,
    )
    db.add(new_request)
    db.flush()

    return new_request
```

**What this function is for:** the ONE place that actually builds a real `VerificationRequest` row. Both submit paths (draft and direct) call this, so the actual "how do you turn info into a real database row" logic exists exactly once.

**Notable lines:**

`transition_complaint_status(complaint, "under_review")` — right here is where the status-transition logic from Part A actually gets used. This one line is what makes a complaint disappear from "Ready to Send" and appear (indirectly, through its linked request) in "Awaiting FDA."

`product_name=complaint.product_title` — notice `VerificationRequest.product_name` is filled in from the COMPLAINT's `product_title`, not from anything the officer typed. Neither draft type nor the direct-create schema has its own `product_name` field — it's always borrowed from the linked complaint, matching your original design decision that most verification-request display data comes from the complaint, not stored separately.

`db.flush()` (not `db.commit()`) — sends the insert to Postgres immediately so `new_request.request_id` gets generated and becomes available, WITHOUT permanently finalizing the transaction yet. The functions that call this one control the actual `db.commit()` timing.

```python
def submit_verification_draft(db: Session, draft_id: UUID, current_user) -> VerificationRequest:
    draft = db.query(VerificationRequestDraft).filter(
        VerificationRequestDraft.draft_id == draft_id,
        VerificationRequestDraft.saved_by == current_user.user_id,
    ).first()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")

    new_request = _create_verification_request(
        db, current_user,
        complaint_id=draft.complaint_id,
        product_code=draft.product_code,
        priority=draft.priority,
        complaint_statement=draft.notes_to_fda,
        region_id=draft.region_id,
    )

    db.commit()
    db.refresh(new_request)

    db.delete(draft)
    db.commit()

    return new_request
```

**What this is for:** finishes an EXISTING draft into a real verification request. Fetches the draft (making sure it belongs to the officer asking), builds the real request using the shared function above, commits (this is the "point of no return" — the real row now genuinely exists), THEN deletes the draft, THEN commits again. Notice there's no file-cleanup step here at all, unlike the walk-in version — verification drafts never had files of their own to clean up.

```python
def create_verification_request_direct(
    db: Session,
    current_user,
    complaint_id: UUID,
    product_code: str | None,
    priority: str,
    notes_to_fda: str,
) -> VerificationRequest:
    new_request = _create_verification_request(
        db, current_user,
        complaint_id=complaint_id,
        product_code=product_code,
        priority=priority,
        complaint_statement=notes_to_fda,
        region_id=current_user.region_id,
    )
    db.commit()
    db.refresh(new_request)
    return new_request
```

**What this is for:** the no-draft path. Much shorter than the draft version, because there's no draft to fetch or delete — just build the request and commit.

---

## File: `app/desktop/routers/complaints/complaint_detail.py`

```python
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.core.dependencies import get_current_user
from app.desktop.schemas.complaints.complaints import ComplaintVerificationDetailResponse
from app.desktop.services.complaints.complaint_detail_service import get_complaint_verification_detail

from app.models.verification_requests import VerificationRequest
from app.desktop.schemas.complaints.complaints import ComplaintAwaitingRequestResponse

from app.models.complaints import Complaint

router = APIRouter(prefix="/complaints", tags=["Complaint Detail"])


    #
    #
    #
    #
    #
    #
    # GET /complaints/{complaint_id}/verification-detail
@router.get("/{complaint_id}/verification-detail", response_model=ComplaintVerificationDetailResponse)
def get_complaint_detail_for_verification(
    complaint_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_complaint_verification_detail(db, complaint_id, current_user.region_id)
```

**What this endpoint is for:** this is Case 1 — an officer clicks a complaint directly from the "Walk-in cases awaiting your request" list, BEFORE any draft exists. The right-side panel (case info, product, complainant, files) needs to show up immediately, and this is the endpoint that fetches all of it.

**Why the function body is only ONE line:** notice this endpoint does almost nothing itself — it just receives the HTTP request, pulls out `complaint_id` from the URL, and immediately hands off to `get_complaint_verification_detail` (the real logic, from the service file above). This is a deliberate pattern used throughout this whole project: **routers handle the "web request" part, services handle the "actual work" part.** Keeping them separate means the exact same logic could be reused somewhere that isn't a web request at all (a background job, a script) without needing to touch this file.

`current_user.region_id` — this is where the officer's OWN region gets passed in, never something the frontend could fake by sending a different value in the URL or body — it always comes from the verified login token, via `get_current_user`.

```python
    #
    #
    #
    #
    #
    #
    # GET /complaints/awaiting-verification-request
@router.get("/awaiting-verification-request", response_model=list[ComplaintAwaitingRequestResponse])
def list_complaints_awaiting_request(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    complaint_ids_with_requests = db.query(VerificationRequest.complaint_id).subquery()

    complaints = db.query(Complaint).filter(
        Complaint.complaint_id.notin_(complaint_ids_with_requests),
        Complaint.status == "open",
        Complaint.region_id == current_user.region_id,
    ).order_by(Complaint.created_at.desc()).all()

    return complaints
```

**What this endpoint is for:** powers the "Ready to Send" left-panel list — every complaint that's still waiting for someone to compose and send a verification request for it.

**The new syntax here — `.notin_()` with a subquery:**

`complaint_ids_with_requests = db.query(VerificationRequest.complaint_id).subquery()` — this doesn't run on its own, right away. Think of it as preparing a small "helper list" — specifically, a list of every `complaint_id` that ALREADY has at least one verification request. `.subquery()` marks it as "this is meant to be used INSIDE another, bigger query," not run by itself.

`Complaint.complaint_id.notin_(complaint_ids_with_requests)` — "give me complaints whose ID is NOT found inside that helper list." This is the exact opposite of `.in_()`, which you've already used before (in the update-draft endpoint, for `remove_attachment_ids`). Where `.in_()` means "IS this present in that list," `.notin_()` means "is this ABSENT from that list."

The other two filter conditions (`status == "open"` and `region_id == current_user.region_id`) work exactly like every other filter you've written before — plain equality checks, all joined by commas meaning "all of these must be true together."

---

## File: `app/desktop/routers/complaints/shared_files.py`

```python
import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.core.dependencies import get_current_user
from app.models.shared_files import SharedFile

router = APIRouter(prefix="/shared-files", tags=["Shared Files"])


    #
    #
    #
    #
    #
    #
    # GET /shared-files/{file_id}/download
@router.get("/{file_id}/download")
def download_shared_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    file_row = db.query(SharedFile).filter(
        SharedFile.file_id == file_id,
        SharedFile.region_id == current_user.region_id,
    ).first()

    if not file_row:
        raise HTTPException(status_code=404, detail="File not found.")

    if not os.path.exists(file_row.file_path):
        raise HTTPException(status_code=404, detail="File no longer exists on disk.")

    return FileResponse(
        path=file_row.file_path,
        filename=file_row.file_name,
        media_type=file_row.mime_type,
    )
```

**What this endpoint is for:** lets an officer actually download a real evidence file that's attached to a complaint.

**The new piece — `FileResponse`:** every other endpoint in this whole project has returned either a Pydantic schema (converted to JSON automatically) or a plain dictionary. `FileResponse` is different — it's a special FastAPI class specifically for sending back the raw BYTES of an actual file, so the browser downloads/displays it, instead of getting back a JSON description of the file.

`path=file_row.file_path` — where on YOUR server's disk the real file physically sits (something like `uploads/shared_files/<complaint_id>/<uuid>_original_name.jpg`).

`filename=file_row.file_name` — this is what the BROWSER will suggest as the saved filename when the person downloads it. Notice this is deliberately the ORIGINAL name (`"draft tables.docx"`), not the messy UUID-prefixed name it's actually stored under on disk — nobody wants to download a file named `a1b2c3d4-....docx`.

`media_type=file_row.mime_type` — tells the browser WHAT KIND of file this is (`application/pdf`, `image/jpeg`, etc.), so it can decide whether to show a preview or just force a download.

**Two separate `if not ...: raise` checks worth noticing why they're separate:** the first checks if the DATABASE ROW exists (maybe the file_id is just wrong or belongs to another region). The second checks if the ACTUAL FILE still physically exists on disk — a genuinely different failure, since it's possible for the database to still have a record even if someone manually deleted the real file separately. Keeping these as two distinct checks means the error message correctly tells you WHICH thing is actually missing.

---

## File: `app/desktop/routers/verification/verification_requests.py`

```python
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.core.dependencies import get_current_user
from app.desktop.schemas.verification.verification import (
    VerificationRequestCreate,
    VerificationRequestResponse,
    VerificationRequestAwaitingFDAResponse,
)
from app.desktop.services.verification.verification_submit_service import (
    submit_verification_draft,
    create_verification_request_direct,
)
from app.models.verification_requests import VerificationRequest
from app.models.complaints import Complaint
from app.models.walkin_complainants import WalkinComplainant

draft_submit_router = APIRouter(prefix="/drafts/verification", tags=["Verification Requests"])
direct_request_router = APIRouter(prefix="/verification-requests", tags=["Verification Requests"])
list_router = APIRouter(prefix="/verification-requests", tags=["Verification Requests"])
```

**Why THREE separate router objects in one file:** each one needs a different URL prefix (`/drafts/verification`, `/verification-requests`), and while `direct_request_router` and `list_router` happen to share the same prefix, keeping them as separate named routers still keeps "submitting a new request" visually and organizationally separate from "browsing existing requests" — even though technically they could have been combined into one. This mirrors the exact same pattern used in `walkin_complaints.py`.

```python
    #
    #
    #
    #
    #
    #
    # POST /drafts/verification/{draft_id}/submit
@draft_submit_router.post("/{draft_id}/submit", response_model=VerificationRequestResponse)
def submit_draft(
    draft_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return submit_verification_draft(db, draft_id, current_user)
```

**What this is for:** the actual web-facing endpoint for "finish this draft and send it to FDA." Again, notice it's almost entirely empty — just receives the request and hands off to the real service function.

```python
    #
    #
    #
    #
    #
    #
    # POST /verification-requests/
@direct_request_router.post("/", response_model=VerificationRequestResponse)
def create_request_direct(
    data: VerificationRequestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return create_verification_request_direct(
        db, current_user,
        complaint_id=data.complaint_id,
        product_code=data.product_code,
        priority=data.priority,
        notes_to_fda=data.notes_to_fda,
    )
```

**What this is for:** "send a verification request right now, no draft involved." Notice this one takes `data: VerificationRequestCreate` as a plain parameter — since there are no files involved in verification requests, this can be a normal JSON body, unlike the walk-in equivalent which needed all those separate `Form()` fields for file-upload support.

```python
    #
    #
    #
    #
    #
    #
    # GET /verification-requests/awaiting-fda
@list_router.get("/awaiting-fda", response_model=list[VerificationRequestAwaitingFDAResponse])
def list_verification_requests_awaiting_fda(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    results = db.query(VerificationRequest, Complaint, WalkinComplainant).join(
        Complaint, VerificationRequest.complaint_id == Complaint.complaint_id
    ).outerjoin(
        WalkinComplainant, Complaint.complainant_id == WalkinComplainant.complainant_id
    ).filter(
        VerificationRequest.verification_request_status == "pending",
        Complaint.region_id == current_user.region_id,
    ).order_by(VerificationRequest.requested_at.desc()).all()

    return [
        VerificationRequestAwaitingFDAResponse(
            request_id=request.request_id,
            complaint_id=complaint.complaint_id,
            case_reference=complaint.case_reference,
            product_name=request.product_name,
            manufacturer=complaint.manufacturer,
            product_category=complaint.product_category,
            complainant_name=complainant.full_name if complainant else None,
            source=complaint.source,
            priority=request.priority,
            requested_at=request.requested_at,
        )
        for request, complaint, complainant in results
    ]
```

**What this is for:** powers the "Awaiting FDA" tab's list — every verification request that's currently `pending`.

**The interesting new part — the `return [ ... for ... in results ]` at the bottom:** this is a list comprehension building a whole list of schema OBJECTS, not just plain values (compare to the simpler `[a.file_path for a in ...]` you've seen before). For each three-item bundle `(request, complaint, complainant)` in `results`, it constructs one full `VerificationRequestAwaitingFDAResponse`, pulling different fields from different pieces of the bundle (some from `request`, some from `complaint`, one from `complainant` with the same "unless it's missing" safety check as before) — then collects every one of these constructed objects into the final list that gets returned.

---

## File: `app/desktop/routers/drafts/verification_drafts.py` (the ONE endpoint that changed)

```python
    #
    #
    #
    #
    #
    #
    # GET /drafts/verification/{draft_id}
@router.get("/{draft_id}", response_model=VerificationRequestDraftDetailResponse)
def get_verification_draft(
    draft_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    draft = db.query(VerificationRequestDraft).filter(
        VerificationRequestDraft.draft_id == draft_id,
        VerificationRequestDraft.saved_by == current_user.user_id,
    ).first()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")

    complaint_detail = get_complaint_verification_detail(db, draft.complaint_id, current_user.region_id)

    return VerificationRequestDraftDetailResponse(
        draft_id=draft.draft_id,
        draft_status=draft.draft_status,
        product_code=draft.product_code,
        priority=draft.priority,
        notes_to_fda=draft.notes_to_fda,
        saved_by=draft.saved_by,
        region_id=draft.region_id,
        created_at=draft.created_at,
        updated_at=draft.updated_at,
        complaint=complaint_detail,
    )
```

**What changed and why:** this endpoint used to just return the raw `draft` object directly (letting `from_attributes=True` handle the conversion automatically). Now it does two things: fetches the draft as before, THEN calls `get_complaint_verification_detail` to also fetch everything about the linked complaint, and finally builds a `VerificationRequestDraftDetailResponse` BY HAND, combining both — this is Case 2 (reopening an existing draft), and it's the endpoint that needs BOTH the editable draft fields AND the read-only complaint detail together in one response.

`complaint=complaint_detail` — this is where the nesting from Part A actually happens in practice. `complaint_detail` is a whole, already-built `ComplaintVerificationDetailResponse` object, and it gets slotted directly into the `complaint` field of the bigger response — producing that nested JSON shape (`{"draft_id": ..., "complaint": {...}}`) described earlier.
