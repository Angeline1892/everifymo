# Code Walkthrough — Part A: Schemas & Core Helpers

This walks through every NEW file from this session, the same deep way we went through `walkin_drafts.py` earlier — file path first, then each piece of code with a plain explanation of what it does and why, plus the important syntax pointed out.

---

## File: `app/core/constants.py` (addition)

```python
VALID_COMPLAINT_TRANSITIONS = {
    "extension": {
        "open": ["under_review", "dismissed"],
        "under_review": ["takedown_requested", "dismissed"],
        "takedown_requested": ["completed", "dismissed"],
        "completed": [],
        "dismissed": [],
    },
    "walk_in": {
        "open": ["under_review", "dismissed"],
        "under_review": ["takedown_requested", "dismissed"],
        "takedown_requested": ["takedown_initiated", "dismissed"],
        "takedown_initiated": ["completed", "dismissed"],
        "completed": [],
        "dismissed": [],
    },
}
```

**What this is for:** a rulebook saying "which status can move to which other status." Not a function, not a class — just a plain nested dictionary sitting there as data, meant to be looked up by other code.

**Important syntax:** this is a **dictionary of dictionaries**. The outer dictionary's keys are `"extension"` and `"walk_in"` (the two `source` values a complaint can have). Each of those maps to ANOTHER dictionary, where the keys are current statuses, and the values are LISTS of statuses that status is allowed to move to. So to read "can a walk-in complaint move from `open` to `dismissed`?" you'd write `VALID_COMPLAINT_TRANSITIONS["walk_in"]["open"]` — that gives you `["under_review", "dismissed"]`, and you'd check if `"dismissed"` is inside that list.

---

## File: `app/core/complaint_status.py`

```python
from fastapi import HTTPException

from app.core.constants import VALID_COMPLAINT_TRANSITIONS
from app.models.complaints import Complaint


def transition_complaint_status(complaint: Complaint, new_status: str) -> None:
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
```

**What this is for:** a small, reusable "gatekeeper" function. Anywhere in the codebase that needs to change a complaint's status calls this function instead of just writing `complaint.status = "whatever"` directly — that way, the rulebook above always gets checked first, everywhere, consistently.

**Line by line:**

`def transition_complaint_status(complaint: Complaint, new_status: str) -> None:` — takes in the actual complaint object (a real row from the database, already loaded into Python) and the status you're TRYING to move it to. `-> None` means this function doesn't hand anything back — it just does its job (either changes the status, or throws an error) and finishes.

`allowed_next_statuses = VALID_COMPLAINT_TRANSITIONS[complaint.source][complaint.status]` — this is the lookup described above, done using the COMPLAINT'S OWN current values. `complaint.source` might be `"walk_in"`, `complaint.status` might currently be `"open"` — so this line fetches `["under_review", "dismissed"]` from the rulebook.

`if new_status not in allowed_next_statuses:` — checks if the status you're TRYING to move to is genuinely allowed. `not in` is Python's way of asking "is this value absent from this list."

`raise HTTPException(status_code=400, detail=...)` — if the move isn't allowed, immediately stop and send back a clear error explaining exactly why (which status it tried to go from/to, and for which source), rather than letting something invalid happen silently.

`complaint.status = new_status` — if we got past the check, this is the actual change. Notice this does NOT save anything to the real database — it just changes the value sitting in Python's memory, on this specific object. Whatever code CALLED this function is responsible for eventually calling `db.commit()` to make it permanent.

---

## File: `app/desktop/schemas/drafts/drafts.py` (addition)

```python
class SortOption(str, Enum):
    recently_edited = "recently_edited"
    oldest_first = "oldest_first"
    product_name_az = "product_name_az"
```

**What this is for:** restricts the `sort` query parameter on list endpoints to exactly these three values — same enum pattern as `DraftStatus`. If someone tries `?sort=banana`, FastAPI automatically rejects the request before your code even runs, since `"banana"` isn't one of these three options.

---

## File: `app/desktop/schemas/complaints/complaints.py`

### Piece 1 — the file's own imports

```python
from app.desktop.schemas.drafts.drafts import DraftStatus, Priority
```

**Important syntax:** this line is a schema file importing FROM another schema file. `DraftStatus` and `Priority` were originally built for drafts, but they're genuinely useful here too (a verification draft's `priority`, and a nested response's `draft_status`, need the exact same restricted set of values) — rather than copy-pasting the same enum a second time in a new file, we just reuse the original by importing it. This was the actual bug fixed earlier in the session — this import line was missing at first, causing a crash.

### Piece 2 — `ComplaintResponse`

```python
class ComplaintResponse(BaseModel):
    complaint_id: UUID
    case_reference: str
    region_id: UUID
    source: str
    product_title: str
    manufacturer: str | None
    product_category: str | None
    place_of_purchase: str | None
    date_of_purchase: date | None
    amount_paid: Decimal | None
    nature_of_complaint: str | None
    status: str
    complainant_id: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

**What this is for:** the shape of data sent back after a complaint gets created (either from a submitted draft, or logged directly). No matching "Save" schema exists for this one, because nobody ever directly types up and submits a raw `Complaint` object — it only ever gets created indirectly through the submit services.

### Piece 3 — `SharedFileResponse`

```python
class SharedFileResponse(BaseModel):
    file_id: UUID
    file_name: str
    file_size_bytes: int
    mime_type: str
    model_config = ConfigDict(from_attributes=True)
```

**What this is for:** the shape of ONE file's info, used inside a list, whenever a complaint's attached evidence files need to be shown. Just the basics needed to display a filename and, later, feed into the download endpoint.

### Piece 4 — `ComplaintVerificationDetailResponse`

```python
class ComplaintVerificationDetailResponse(BaseModel):
    complaint_id: UUID
    case_reference: str
    product_title: str
    manufacturer: str | None
    product_category: str | None
    complainant_name: str | None
    created_at: datetime
    source: str
    attached_files: list[SharedFileResponse]
```

**What this is for:** the full "read-only display" package for the compose-verification-request screen — everything an officer needs to see about a complaint before deciding to send a request.

**Important syntax:** `attached_files: list[SharedFileResponse]` — this field isn't a single value, it's a LIST of the schema defined right above it. This is how you nest one schema inside another as a collection — "this field holds zero or more of these smaller objects."

**Notice there's no `model_config = ConfigDict(from_attributes=True)` here** — that's deliberate. That setting is only needed when you're handing Pydantic a SINGLE raw database object to read directly. This schema, instead, gets built manually, piece by piece, by code that already gathered data from THREE different tables (`Complaint`, `WalkinComplainant`, `SharedFile`) — there's no single object that has all these fields sitting on it already, so there's nothing for `from_attributes` to read from.

### Piece 5 — `VerificationRequestDraftDetailResponse`

```python
class VerificationRequestDraftDetailResponse(BaseModel):
    draft_id: UUID
    draft_status: DraftStatus
    product_code: str | None
    priority: Priority | None
    notes_to_fda: str | None
    saved_by: UUID
    region_id: UUID
    created_at: datetime
    updated_at: datetime
    complaint: ComplaintVerificationDetailResponse
```

**What this is for:** the full response when an officer reopens an existing verification draft — the draft's own editable fields, PLUS the complaint's read-only display data, all in one response.

**Important syntax:** `complaint: ComplaintVerificationDetailResponse` — this single field's TYPE is an entire other schema, not a plain string or number. This is called "nesting." In the final JSON sent to the frontend, this looks like:
```json
{
  "draft_id": "...",
  "product_code": "...",
  "complaint": {
    "case_reference": "...",
    "attached_files": [...]
  }
}
```
The draft's own fields sit at the top level, and everything borrowed from the complaint sits inside its own `"complaint": {...}` box. This keeps "things the officer can edit" visually separate from "things that are just being displayed, borrowed from elsewhere" — and avoids a naming collision, since BOTH a draft and a complaint have their own `created_at` field; nesting means there's no confusion about which `created_at` is which.

### Piece 6 — `ComplaintAwaitingRequestResponse`

```python
class ComplaintAwaitingRequestResponse(BaseModel):
    complaint_id: UUID
    case_reference: str
    product_title: str
    manufacturer: str | None
    source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

**What this is for:** the shape of ONE row in the "Ready to Send" left-panel list — deliberately lean, only what's needed for that small card view (case ID, product, manufacturer, source). This one DOES use `from_attributes=True`, because — unlike the verification detail schema — this one comes straight from a single, plain `Complaint` query with no joining or manual assembly needed.

---

## File: `app/desktop/schemas/verification/verification.py`

### Piece 1 — imports

```python
from app.desktop.schemas.drafts.drafts import Priority
```

Same reuse-instead-of-duplicate idea as before — `Priority` already exists, no need to rebuild it.

### Piece 2 — `VerificationRequestCreate`

```python
class VerificationRequestCreate(BaseModel):
    complaint_id: UUID
    product_code: str | None = None
    priority: Priority
    notes_to_fda: str
```

**What this is for:** what an officer sends when submitting a verification request DIRECTLY, with no draft involved. Notice `priority` and `notes_to_fda` have NO `= None` after them — meaning they're REQUIRED here (compare this to the draft version, `VerificationRequestDraftSave`, where the same two fields ARE optional, since a draft is allowed to be incomplete). A direct submission has no "incomplete" state at all — if you're sending it straight to FDA, everything needed has to be there.

### Piece 3 — `VerificationRequestResponse`

```python
class VerificationRequestResponse(BaseModel):
    request_id: UUID
    complaint_id: UUID
    requested_by: UUID
    product_name: str
    product_code: str | None
    complaint_statement: str
    verification_request_status: str
    priority: str
    requested_at: datetime
    responded_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
```

**What this is for:** what gets sent back after a verification request is successfully created — a direct read of the real `VerificationRequest` database row.

### Piece 4 — `VerificationRequestAwaitingFDAResponse`

```python
class VerificationRequestAwaitingFDAResponse(BaseModel):
    request_id: UUID
    complaint_id: UUID
    case_reference: str
    product_name: str
    manufacturer: str | None
    product_category: str | None
    complainant_name: str | None
    source: str
    priority: str
    requested_at: datetime
```

**What this is for:** one row in the "Awaiting FDA" list — similar spirit to `ComplaintAwaitingRequestResponse`, but for the OTHER queue, and pulling from `VerificationRequest` joined with `Complaint` and `WalkinComplainant` instead. No `from_attributes=True` here either, for the same reason as the verification-detail schema — this gets manually assembled from a 3-table join, not read directly off one object.

---

*(Continued in Part B — the actual service functions and router endpoints that USE all these schemas.)*
