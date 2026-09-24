# FDA Verification Drafts — Feature Documentation

**Feature:** FDA-side Save Draft for Verification Confirmations  
**Status:** Complete & tested  
**Date completed:** 2026-08-05  
**Author:** Backend — Joy

---

## What This Feature Does

When an FDA officer opens a pending verification request in the Verification Queue and starts filling in their findings (Registered or Unregistered, CPR number, remarks, etc.), they can click **Save Draft** to preserve their in-progress work without submitting it yet. That draft appears in the **Saved Drafts** page, where they can view it, continue editing it, or delete it. Once the officer actually submits their findings, the draft for that case is deleted automatically.

---

## Files Added or Changed

| File | What changed |
|---|---|
| `app/models/fda_verification_drafts.py` | **New.** SQLAlchemy model for the `fda_verification_drafts` table. |
| `app/desktop/schemas/drafts/drafts.py` | **Edited.** Added `FdaDraftVerificationStatus`, `FdaVerificationDraftSave`, `FdaVerificationDraftResponse`, `FdaVerificationDraftListItem`, `FdaVerificationDraftDetailResponse` at the bottom of the existing file. |
| `app/desktop/routers/drafts/fda_verification_drafts.py` | **New.** Four endpoints — POST (upsert), GET single, GET list, DELETE. |
| `app/main.py` | **Edited.** Registered the new router. |
| `alembic/versions/7db97c72b535_*.py` | **Migration.** Creates `fda_verification_drafts` table (auto-generated, verified before applying). |
| `alembic/versions/781a37e25bc1_*.py` | **Migration.** Adds `cpr_number`, `cpr_expiry`, `unregistered_reason` columns to `verification_requests`, plus two new CHECK constraints (manually added — autogenerate does not detect constraint changes on existing tables). |

---

## Database — New Table

### `fda_verification_drafts`

Stores in-progress FDA officer findings before they are submitted. Only the fields the officer actually types are stored here. Everything else (product name, manufacturer, category, case reference) is read-only display data fetched via joins, never duplicated into this table.

| Column | Type | Notes |
|---|---|---|
| `draft_id` | UUID PK | Auto-generated. |
| `saved_by` | UUID FK → `users.user_id` | The FDA officer who owns this draft. RESTRICT on delete. Private — no other officer can view or edit it. |
| `verification_request_id` | UUID FK → `verification_requests.request_id` | The request this draft is composed against. RESTRICT on delete. |
| `draft_status` | VARCHAR(50) | `'incomplete'` or `'draft'`. Default `'draft'`. Set by the backend, never by the officer. |
| `draft_verification_status` | VARCHAR(50) | `'registered'` or `'unregistered'`, or NULL if not chosen yet. |
| `draft_cpr_number` | VARCHAR(100) | CPR registration number. Only relevant when `draft_verification_status = 'registered'`. |
| `draft_cpr_expiry` | DATE | CPR expiry date. Optional even for registered. |
| `draft_response_notes` | TEXT | Official FDA remarks (registered path) or Advisory & Enforcement Recommendations (unregistered path). |
| `draft_unregistered_reason` | TEXT | Reason the product is not registered. Only relevant when `draft_verification_status = 'unregistered'`. |
| `created_at` | TIMESTAMPTZ | Set on insert. |
| `updated_at` | TIMESTAMPTZ | Updated on every save. Drives the "Last Modified" column in the Saved Drafts UI. |

**CHECK constraints:**
- `draft_status IN ('incomplete', 'draft')`
- `draft_verification_status IS NULL OR draft_verification_status IN ('registered', 'unregistered')`

**No unique constraint** on `(verification_request_id, saved_by)` — uniqueness is enforced at the application layer (the POST endpoint checks for an existing draft before deciding to insert or update). This is consistent with how LEA draft tables handle the same concern.

---

## Database — Changes to `verification_requests`

Three new columns added to support the real submission (used by the submit endpoint, built in the next phase):

| Column | Type | Notes |
|---|---|---|
| `cpr_number` | VARCHAR(100) | Required when `verification_request_status = 'confirmed_registered'`. |
| `cpr_expiry` | DATE | Optional even for registered. |
| `unregistered_reason` | TEXT | Required when `verification_request_status = 'confirmed_unregistered'`. |

**Two new CHECK constraints added (manually in migration — autogenerate missed these):**
- `ck_verification_requests_registered_fields_required` — enforces `cpr_number IS NOT NULL AND response_notes IS NOT NULL` when status is `confirmed_registered`.
- `ck_verification_requests_unregistered_reason_required` — enforces `unregistered_reason IS NOT NULL` when status is `confirmed_unregistered`.

> **Note for future migrations:** Alembic autogenerate reliably picks up CHECK constraints when creating a brand-new table, but does NOT detect constraint additions or changes on tables that already exist. Always manually verify CHECK constraints in any migration that alters an existing table.

---

## How `draft_status` Is Decided

The backend decides `incomplete` vs `draft` — the frontend never sends this field. The rule is simple:

- If `draft_verification_status` is `null` (officer hasn't picked Registered or Unregistered yet) → `incomplete`
- If `draft_verification_status` is set to either value → `draft`

Everything else (CPR number, remarks, reason) can stay blank — drafts are meant to be saved mid-progress.

---

## API Endpoints

Base prefix: `/drafts/fda-verification`  
All endpoints require a valid FDA officer Bearer token.  
Region scoping: enforced through `Complaint.region_id == current_user.region_id` on the parent request — an officer outside the region sees the same 404 as if the request didn't exist.

---

### POST `/drafts/fda-verification/{verification_request_id}`

**What it does:** Saves the officer's in-progress findings for one verification request. Acts as an upsert — first call creates a new draft row, every call after that on the same request updates the same row. The officer never ends up with two drafts for one case.

**Request body (JSON):**
```json
{
  "draft_verification_status": "registered" | "unregistered" | null,
  "draft_cpr_number": "FDA-CPR-2024-99812" | null,
  "draft_cpr_expiry": "2027-12-31" | null,
  "draft_response_notes": "..." | null,
  "draft_unregistered_reason": "..." | null
}
```

**Response:** `FdaVerificationDraftResponse` — the saved draft row fields.

**Errors:**
- `404` — verification request not found, or belongs to a different region.

---

### GET `/drafts/fda-verification/{draft_id}`

**What it does:** Returns one draft's saved fields plus read-only case info joined from the parent request and complaint. Powers both the **View** and **Edit Draft** buttons in the Saved Drafts table — the frontend decides whether to open the form read-only or editable; the backend call is identical either way.

**Response:** `FdaVerificationDraftDetailResponse` — includes everything in the bare draft response, plus `case_reference`, `product_name`, `manufacturer`, `product_category`, `requested_by_name` (formatted as `"Position FirstName LastName"`, or `null` if the officer's profile is incomplete), and `requested_at`.

**Errors:**
- `404` — draft not found, or belongs to a different officer (deliberately vague — never reveals that a draft exists but belongs to someone else).

---

### GET `/drafts/fda-verification/`

**What it does:** Returns a paginated list of drafts saved by the currently logged-in officer. Fills the Saved Drafts table in the UI, including the "Showing X–Y of Z drafts" counter and Prev/Next controls. Each row includes joined case info (case reference, product name, manufacturer, category) since none of that lives on the draft row itself.

**Query parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `search` | string | none | Free-text match against case reference, product name, OR manufacturer (case-insensitive, partial match). Matches the UI's "Search Case ID, Product, or Manufacturer..." box. |
| `category` | string | none | Exact match against product category (e.g. `Cosmetics`, `Drugs`). Maps to the Category dropdown filter. |
| `date_filter` | date (`YYYY-MM-DD`) | none | Matches drafts last modified on this exact calendar day. Maps to the Date filter. |
| `sort` | enum | `recently_edited` | `recently_edited` / `oldest_first` / `product_name_az` |
| `page` | int | `1` | 1-indexed page number. |
| `page_size` | int | `5` | Rows per page, max 50. |

**Response:** `FdaVerificationDraftListResponse`
```json
{
  "items": [ /* list of FdaVerificationDraftListItem */ ],
  "total": 6,
  "page": 1,
  "page_size": 5
}
```
`total` is the full count of matching rows across all pages (computed before pagination is applied), not just the count of `items` in this response — this is what the frontend uses to render page numbers and the "Showing X of Y" counter.

---

### DELETE `/drafts/fda-verification/{draft_id}`

**What it does:** Removes one draft. Used by the **Delete** option in the Saved Drafts row actions menu. Also reused internally by the real submit endpoint (next phase) — once an officer's findings are submitted, the leftover draft for that case is deleted via this same logic.

**Response:** `{"message": "Draft deleted successfully."}`

**Errors:**
- `404` — draft not found or belongs to a different officer.

---

## Test Results (all passing)

| Test | Expected | Result |
|---|---|---|
| POST blank draft | `draft_status: "incomplete"`, new row | ✅ |
| POST again same request with `"registered"` | Same `draft_id`, `draft_status: "draft"` | ✅ Upsert confirmed |
| POST with non-existent request ID | 404 | ✅ |
| GET list | One row, correct joined fields (case_reference, product_name, etc.) | ✅ |
| GET single draft | Full detail, `requested_by_name` null-safe (not `"None None"`) | ✅ |
| GET list with `search=DFS` | Returns matching draft only | ✅ |
| GET list with `search=VER%20TEST` (multi-word) | Returns matching draft only — confirmed URL-encoded spaces work correctly | ✅ |
| GET list, no filters | Returns `{items, total, page, page_size}` envelope, `total` reflects full count | ✅ |
| DELETE draft | `{"message": "Draft deleted successfully."}` | ✅ |
| GET deleted draft | 404 | ✅ |

> **Note:** the list endpoint's response shape changed from a bare `list[...]` to the `FdaVerificationDraftListResponse` envelope (`items` / `total` / `page` / `page_size`) partway through testing, once pagination was added. Any frontend code written against the earlier bare-list shape needs updating to read `.items` instead of the response body directly.

---

## What Comes Next

The next phase is the **real FDA submit endpoint** — the action behind the **Submit Verification** button in the Verification Queue. That endpoint will:

1. Validate all required fields for the chosen status (CPR number + remarks for registered, unregistered reason for unregistered, rejection reason for rejected).
2. Update `verification_requests` — write `verification_request_status`, `cpr_number`, `cpr_expiry`, `response_notes`, `unregistered_reason` or `rejection_reason`, stamp `responded_by` and `responded_at`.
3. Transition `complaints.status` via the existing `transition_complaint_status()` helper — `confirmed_registered` → `dismissed`, `confirmed_unregistered` → `takedown_requested`, `rejected` → `dismissed`.
4. Delete the FDA officer's draft for this request (if one exists) since it's now obsolete.

That submit logic is complex enough (four tables touched in a specific order) to live in a service file — `app/desktop/services/verification/fda_verification_response.py` — not in the router directly.
