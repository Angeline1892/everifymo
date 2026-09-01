# Walk-in Intake Drafts — Documentation Addendum

**Covers:** everything added AFTER the original documentation (`walkin-intake-drafts-documentation.md`).
**New in this addendum:** the walk-in list endpoint, the combined "All Drafts" endpoint, and two new schema pieces (`DraftType`, `UnifiedDraftResponse`).

Read this alongside the original documentation — it does not repeat the model/schema/RLS/testing-setup basics already covered there.

---

## 1. Which Endpoint Does What (Quick Reference)

It's easy to mix these up since several endpoints look similar. Here's the full picture of all six walk-in-related endpoints built so far:

| Endpoint | Method + Path | Purpose |
|---|---|---|
| Save | `POST /drafts/walkin/` | Create a brand new draft |
| Get One | `GET /drafts/walkin/{draft_id}` | **Powers the "Edit Draft" button** — fetches one draft's full data so the New Walk-in Intake form can be pre-filled |
| Update | `PUT /drafts/walkin/{draft_id}` | Save changes after editing (full replace of text fields, add/remove files) |
| Delete | `DELETE /drafts/walkin/{draft_id}` | Delete a draft entirely (cascades to attachments + disk files) |
| List (walk-in only) | `GET /drafts/walkin/` | Powers the **"Walk-in Intake" tab** on the Saved Drafts page |
| List (combined) | `GET /drafts/` | Powers the **"All Drafts" tab** on the Saved Drafts page — merges walk-in and verification request drafts together |

**Important clarification:** clicking "Edit Draft" in the UI does **not** use either list endpoint. It uses the **Get One** endpoint (`GET /drafts/walkin/{draft_id}`), fetching that single draft's complete data, which the frontend then uses to pre-fill every field on the intake form.

---

## 2. `GET /drafts/walkin/` — Walk-in List Endpoint

**Location:** `app/desktop/routers/drafts/walkin_drafts.py`

### What's new here (concepts not seen in earlier endpoints)

**Query parameters** — different from path parameters (like `{draft_id}`) or form fields (like the save endpoint's `Form(...)` fields). These are the `?key=value` pieces that come after a `?` in a URL, e.g.:
```
/drafts/walkin/?status=draft&search=BioGlow
```
In code, they're declared using `Query(None)` instead of `Form(None)` — same "optional, defaults to nothing if not provided" idea, just for a different part of the request.

**Building a query gradually before running it:**
```python
query = db.query(WalkinIntakeDraft).filter(WalkinIntakeDraft.saved_by == current_user.user_id)

if status is not None:
    query = query.filter(WalkinIntakeDraft.draft_status == status)

if search is not None:
    query = query.filter(WalkinIntakeDraft.product_name.ilike(f"%{search}%"))

query = query.order_by(WalkinIntakeDraft.updated_at.desc())
drafts = query.all()
```
Each `.filter(...)` call doesn't touch the database yet — it just adds one more condition and hands back a new, still-unexecuted query. Nothing actually runs until `.all()` is called at the very end. This lets filters be applied conditionally (only if the officer actually provided them) without needing a different query built for every possible combination of filters.

**`.ilike()`** — case-insensitive partial text matching. `product_name.ilike(f"%{search}%")` means "match any product name that contains this search text anywhere inside it," not just an exact match. The `%` symbols mean "anything can come before/after this."

### Filters Supported
- `status` — `incomplete` or `draft`
- `search` — matches against `product_name` (partial, case-insensitive)

### Result Ordering
Sorted by `updated_at`, newest first — matches the "Recently Edited" default sort shown in the UI.

---

## 3. `GET /drafts/` — Combined "All Drafts" Endpoint

**Location:** `app/desktop/routers/drafts/all_drafts.py` (new file, separate router)

### Why This Needed Its Own Router File

`walkin_intake_drafts` and `verification_request_drafts` are two completely separate database tables. This endpoint needs to read from **both** and merge the results into one combined list — it doesn't naturally belong under `/drafts/walkin` specifically, so it got its own file with its own router, using just `prefix="/drafts"` instead of `/drafts/walkin`.

### The `draft_type` Problem — And Why No New Column Was Needed

The Saved Drafts UI has a filter letting the officer choose "Walk-in Intake" or "Verification Request" specifically. But since each draft type already lives in its own separate table, **the table a row lives in already tells you its type** — there was no need to add an actual `draft_type` column to either table, or write a migration for it.

Instead, `draft_type` is a value **invented in Python code**, stamped onto each row manually while building the combined response:
```python
draft_type=DraftType.walkin        # for every row pulled from walkin_intake_drafts
draft_type=DraftType.verification  # for every row pulled from verification_request_drafts
```

### New Schema: `DraftType`
Added to `app/desktop/schemas/drafts/drafts.py`:
```python
class DraftType(str, Enum):
    walkin = "walkin"
    verification = "verification"
```
Same enum pattern as `DraftStatus` — restricts the value to exactly these two options.

### New Schema: `UnifiedDraftResponse`
Also added to `drafts.py`. This is different from every other response schema in the file — it does **not** use `model_config = ConfigDict(from_attributes=True)`, because there is no single database row that naturally has all these fields at once. This schema is built manually, field by field, inside the endpoint — not read directly off one SQLAlchemy object.

```python
class UnifiedDraftResponse(BaseModel):
    draft_id: UUID
    draft_type: DraftType
    product_name: str | None
    manufacturer: str | None
    product_category: str | None
    complainant_name: str | None
    saved_by: UUID
    region_id: UUID
    draft_status: DraftStatus
    created_at: datetime
    updated_at: datetime
```

### `complainant_name` — Where It Actually Comes From

This field doesn't exist as a real column on either draft table. It's a **flattened, common field name** invented so the frontend's "Complainant" column can display consistently, regardless of draft type — even though the real source is completely different underneath:

| Draft Type | Real Source of the Name |
|---|---|
| Walk-in | Direct copy of the draft's own `full_name` column |
| Verification Request | Looked up two tables away: `draft.complaint_id` → `Complaint.complainant_id` → `WalkinComplainant.full_name` |

### How the Endpoint Builds Its Response

Because the final shape can't come from one single query, the endpoint runs **two separate database queries** and manually assembles the results:

**Step 1 — Walk-in drafts** (skipped entirely if the officer filtered to `verification` only):
```python
if draft_type in (None, DraftType.walkin):
    q = db.query(WalkinIntakeDraft).filter(WalkinIntakeDraft.saved_by == current_user.user_id)
    # ...status/search filters applied same as the walk-in list endpoint...
    for d in q.all():
        results.append(UnifiedDraftResponse(..., complainant_name=d.full_name, ...))
```

**Step 2 — Verification request drafts** (skipped entirely if filtered to `walkin` only):
```python
if draft_type in (None, DraftType.verification):
    q = db.query(VerificationRequestDraft, Complaint, WalkinComplainant).join(
        Complaint, VerificationRequestDraft.complaint_id == Complaint.complaint_id
    ).outerjoin(
        WalkinComplainant, Complaint.complainant_id == WalkinComplainant.complainant_id
    ).filter(VerificationRequestDraft.saved_by == current_user.user_id)
    for draft, complaint, complainant in q.all():
        results.append(UnifiedDraftResponse(
            ...,
            product_name=complaint.product_title,       # NOT draft.product_name — doesn't exist
            complainant_name=complainant.full_name if complainant else None,
        ))
```

### `.join()` vs `.outerjoin()` — Why Both Are Used, Not Just One

- **`Complaint` uses a regular `.join()`** — safe, because `VerificationRequestDraft.complaint_id` is `NOT NULL`. Every verification draft is guaranteed to have a real, matching complaint. A regular join never risks losing a row here.

- **`WalkinComplainant` uses `.outerjoin()`** — required, because `Complaint.complainant_id` is **nullable** (a complaint from the browser extension, for example, might have no walk-in complainant at all). If a regular `.join()` were used here instead, any verification draft whose complaint has no linked complainant would **silently vanish from the entire results list** — not just missing a name, the whole row would disappear. `.outerjoin()` keeps the row regardless, leaving `complainant` as `None` when there's no match — which is exactly why the code checks `complainant.full_name if complainant else None` rather than assuming `complainant` always exists.

### Sorting Across Two Separate Queries

```python
results.sort(key=lambda r: r.updated_at, reverse=True)
```
Since the two queries run independently, there's no single SQL `ORDER BY` that could sort both together. Instead, the already-combined Python list gets sorted afterward. `reverse=True` means most-recently-edited first.

### Filters Supported
- `draft_type` — `walkin`, `verification`, or omitted (both)
- `status` — `incomplete` or `draft`
- `search` — for walk-in rows, matches `product_name`; for verification rows, matches the joined `Complaint.product_title` (since `VerificationRequestDraft` has no `product_name` of its own)

---

## 4. Testing Notes for These Two Endpoints

Both are plain `GET` requests with query parameters and no file uploads — no `multipart/form-data` involved. Test them via curl the same way as everything else in this project (see the original documentation's Swagger header-bug notes — it's been observed on GET-with-required-header endpoints too, not just multipart ones, so curl remains the reliable method throughout this project).

```powershell
# Walk-in only
curl.exe -X GET "http://127.0.0.1:8000/drafts/walkin/" -H "authorization: Bearer PASTE_TOKEN_HERE"
curl.exe -X GET "http://127.0.0.1:8000/drafts/walkin/?status=draft" -H "authorization: Bearer PASTE_TOKEN_HERE"

# Combined
curl.exe -X GET "http://127.0.0.1:8000/drafts/" -H "authorization: Bearer PASTE_TOKEN_HERE"
curl.exe -X GET "http://127.0.0.1:8000/drafts/?draft_type=walkin" -H "authorization: Bearer PASTE_TOKEN_HERE"
curl.exe -X GET "http://127.0.0.1:8000/drafts/?draft_type=verification" -H "authorization: Bearer PASTE_TOKEN_HERE"
```

**Confirmed working (tested):** all-drafts endpoint correctly tags rows with the right `draft_type`, correctly returns an empty list `[]` when filtered to a type with no existing data, and correctly sorts by `updated_at` descending.

**Not yet tested:** the verification-request half of the combined endpoint, since no verification request draft endpoints exist yet to create test data. This should be re-tested once those endpoints are built.

---

## 5. Router Registration Reminder

Don't forget — every new router file needs two lines added to `app/main.py`, or it silently won't exist as far as the running app is concerned:
```python
from app.desktop.routers.drafts.all_drafts import router as all_drafts_router
# ...
app.include_router(all_drafts_router)
```

---

## 6. Updated "What's Left to Build"

- [x] ~~List endpoint~~ — done (both walk-in-only and combined versions)
- [x] ~~Get one endpoint~~ — done
- [x] ~~Update endpoint~~ — done (including add/remove file logic)
- [x] ~~Delete endpoint~~ — done
- [ ] **Verification Request Draft endpoints** (save, get, update, delete) — needed before the combined endpoint's verification half can be tested with real data
- [ ] **Submit service** (`draft_submit_service.py`) — converts a completed draft into a real `complaints` row (walk-in) or `verification_requests` row (verification), following the strict fetch → insert → commit → delete-draft → cleanup-files order
- [ ] Swap local disk storage for AWS S3 once deployment is ready
- [ ] Delete temporary test scripts (`seed_test_officer.py`, `mint_test_token.py`) once real FDA/LEA login exists
